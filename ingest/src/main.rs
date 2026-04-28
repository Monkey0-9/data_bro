pub mod market_data {
    include!(concat!(env!("OUT_DIR"), "/nexus.market_data.rs"));
}

use backoff::ExponentialBackoff;
use csv::ReaderBuilder;
use market_data::{EventType, MarketEvent};
use prost::Message;
use std::fs::File;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::signal;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};
use tracing_subscriber::{EnvFilter, FmtSubscriber};

#[derive(Debug, Clone)]
struct Tick {
    symbol: String,
    price: f64,
    quantity: i32,
}

fn load_ticks(path: &str) -> Vec<Tick> {
    let file = File::open(path).expect("Failed to open tick CSV");
    let mut rdr = ReaderBuilder::new().from_reader(file);
    let mut ticks = Vec::new();

    for result in rdr.records() {
        let record = result.expect("Failed to parse CSV record");
        let symbol = record.get(1).unwrap_or("UNKNOWN").to_string();
        let price: f64 = record.get(2).unwrap_or("0").parse().unwrap_or(0.0);
        let quantity: i32 = record.get(3).unwrap_or("0").parse().unwrap_or(0);
        ticks.push(Tick { symbol, price, quantity });
    }
    ticks
}

async fn send_ilp(stream: &mut TcpStream, table: &str, symbol: &str, price: f64, qty: i32, ts: u64) {
    let line = format!("{} symbol={},price={},quantity={} {}\n", table, symbol, price, qty, ts);
    let _ = stream.write_all(line.as_bytes()).await;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing with OpenTelemetry
    let filter = EnvFilter::from_default_env().add_directive("nexus_ingest=info".parse()?);
    let subscriber = FmtSubscriber::builder().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // OpenTelemetry setup (optional Jaeger export)
    let tracer = opentelemetry_jaeger::new_agent_pipeline()
        .with_service_name("nexus-ingest")
        .install_simple()?;
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
    let subscriber = tracing_subscriber::Registry::default()
        .with(filter)
        .with(telemetry)
        .with(tracing_subscriber::fmt::layer());
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting NEXUS Ingestion Service...");

    let csv_path = std::env::var("TICKS_CSV").unwrap_or_else(|_| "data/ticks.csv".to_string());
    let ticks = load_ticks(&csv_path);
    info!("Loaded {} ticks from {}", ticks.len(), csv_path);

    let quest_host = std::env::var("QUESTDB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let quest_port: u16 = std::env::var("QUESTDB_ILP_PORT")
        .unwrap_or_else(|_| "9009".to_string())
        .parse()
        .unwrap_or(9009);

    let mut stream: Option<TcpStream> = None;
    let mut ticker = interval(Duration::from_millis(500));
    let mut idx = 0;
    let mut seq_num: u64 = 1;

    // Graceful shutdown signal
    let ctrl_c = signal::ctrl_c();
    tokio::pin!(ctrl_c);

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                let tick = &ticks[idx % ticks.len()];
                idx += 1;

                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_nanos() as u64;

                let event = MarketEvent {
                    symbol: tick.symbol.clone(),
                    exchange_timestamp: now.saturating_sub(5_000_000),
                    ingestion_timestamp: now,
                    event_type: EventType::Trade as i32,
                    price: tick.price,
                    quantity: tick.quantity,
                };

                // Connect to QuestDB with backoff if not connected
                if stream.is_none() {
                    let backoff = ExponentialBackoff::default();
                    match TcpStream::connect((quest_host.as_str(), quest_port)).await {
                        Ok(s) => {
                            info!("Connected to QuestDB ILP at {}:{}", quest_host, quest_port);
                            stream = Some(s);
                        }
                        Err(e) => {
                            warn!("QuestDB unavailable ({}:{}) - {}. Retrying with backoff.", quest_host, quest_port, e);
                            tokio::time::sleep(Duration::from_secs(1)).await;
                            continue;
                        }
                    }
                }

                if let Some(ref mut s) = stream {
                    if let Err(e) = send_ilp(s, "ticks", &event.symbol, event.price, event.quantity, now).await {
                        error!("ILP send failed: {}. Reconnecting...", e);
                        stream = None;
                        continue;
                    }
                }

                // Protobuf encode for downstream consumers
                let mut encoded = Vec::new();
                event.encode(&mut encoded)?;

                info!(
                    "[seq={}] {} @ {:.2} qty={} | {} bytes | ts={}",
                    seq_num, event.symbol, event.price, event.quantity, encoded.len(), event.ingestion_timestamp
                );

                seq_num = seq_num.wrapping_add(1);
            }
            _ = ctrl_c => {
                info!("Received shutdown signal. Gracefully stopping...");
                if let Some(mut s) = stream {
                    let _ = s.shutdown().await;
                }
                info!("NEXUS Ingestion Service stopped.");
                return Ok(());
            }
        }
    }
}
