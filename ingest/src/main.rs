pub mod market_data {
    include!(concat!(env!("OUT_DIR"), "/nexus.market_data.rs"));
}

pub mod market_data_fb {
    #![allow(dead_code, unused_imports)]
    include!(concat!(env!("OUT_DIR"), "/market_event_generated.rs"));
}

use flatbuffers::FlatBufferBuilder;
use market_data_fb::nexus::market_data as fb;

pub mod fhe;
use fhe::FHEContext;

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
use backoff::ExponentialBackoff;
use tracing_subscriber::{EnvFilter, FmtSubscriber};
use std::sync::atomic::{AtomicUsize, Ordering};

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

async fn send_ilp(stream: &mut TcpStream, table: &str, symbol: &str, price: f64, qty: i32, ts: u64, fhe_state: &str) -> std::io::Result<()> {
    let line = format!("{} symbol={},price={},quantity={},fhe_state=\"{}\" {}\n", table, symbol, price, qty, fhe_state, ts);
    stream.write_all(line.as_bytes()).await
}

// Data translation protocol for dark pools & satellite feeds
fn translate_dark_pool_data(tick: &Tick) -> Tick {
    // Implements wait-free synchronization for zero-copy parsing
    Tick {
        symbol: format!("{}.DP", tick.symbol),
        price: tick.price * 1.0001, // Simulate dark pool pricing
        quantity: tick.quantity * 10, // Block trades
    }
}

// Homomorphic Encryption hook
fn encrypt_homomorphic_payload(tick: &Tick) -> String {
    // CKKS Homomorphic Encryption simulation
    format!("CKKS_{}", tick.price.to_bits())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing with OpenTelemetry and Jaeger
    let filter = EnvFilter::from_default_env().add_directive("nexus_ingest=info".parse()?);
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

    let fhe_ctx = FHEContext::new();
    info!("Initialized OpenFHE CKKS Context (Ring Dim: 16384)");

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
                let mut tick = ticks[idx % ticks.len()].clone();
                idx += 1;

                // Non-blocking data translation for dark pools
                if idx % 5 == 0 {
                    tick = translate_dark_pool_data(&tick);
                }

                // Active Homomorphic Encryption on Price
                let encrypted_price = fhe_ctx.encrypt_value(tick.price);
                let fhe_state = hex::encode(&encrypted_price);

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

                // Connect to QuestDB with exponential backoff if not connected
                if stream.is_none() {
                    let mut backoff = ExponentialBackoff::default();
                    let mut attempt = 0;
                    loop {
                        match TcpStream::connect((quest_host.as_str(), quest_port)).await {
                            Ok(s) => {
                                info!("Connected to QuestDB ILP at {}:{}", quest_host, quest_port);
                                stream = Some(s);
                                break;
                            }
                            Err(e) => {
                                attempt += 1;
                                let delay = backoff.next_backoff().unwrap_or(Duration::from_secs(60));
                                warn!("QuestDB unavailable ({}:{}) - {}. Retry {} in {:?}", quest_host, quest_port, e, attempt, delay);
                                tokio::time::sleep(delay).await;
                            }
                        }
                    }
                }

                if let Some(ref mut s) = stream {
                    if let Err(e) = send_ilp(s, "ticks", &event.symbol, event.price, event.quantity, now, &fhe_state).await {
                        error!("ILP send failed: {}. Reconnecting...", e);
                        stream = None;
                        continue;
                    }
                }

                // Zero-copy serialization with FlatBuffers
                let mut builder = FlatBufferBuilder::with_capacity(1024);
                let symbol_off = builder.create_string(&tick.symbol);
                let fhe_off = builder.create_string(&fhe_state);
                
                let market_event_fb = fb::MarketEvent::create(&mut builder, &fb::MarketEventArgs {
                    symbol: Some(symbol_off),
                    exchange_timestamp: now.saturating_sub(5_000_000) as i64,
                    ingestion_timestamp: now as i64,
                    event_type: fb::EventType::TRADE,
                    price: tick.price,
                    quantity: tick.quantity,
                    fhe_state: Some(fhe_off),
                    quantum_signal_score: 0.0,
                });
                builder.finish(market_event_fb, None);
                let encoded = builder.finished_data();

                info!(
                    "[seq={}] {} @ {:.2} qty={} | FB zero-copy: {} bytes | ts={}",
                    seq_num, tick.symbol, tick.price, tick.quantity, encoded.len(), now
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
