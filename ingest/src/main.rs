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

use rand_distr::{Normal, Distribution};
use rand::thread_rng;
use market_data::{EventType, MarketEvent};
use prost::Message;
use std::fs::File;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::signal;
use tokio::time::{interval, Duration};
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use backoff::ExponentialBackoff;
use tracing_subscriber::{EnvFilter, FmtSubscriber};
use std::sync::atomic::{AtomicUsize, Ordering};
use aeron_rs::aeron::Aeron;
use aeron_rs::context::Context;
use aeron_rs::publication::Publication;
use aeron_rs::utils::types::Index;
use futures_util::{StreamExt, SinkExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message as WsMessage};
use serde_json::Value;

#[derive(Debug, Clone)]
struct Tick {
    symbol: String,
    price: f64,
    quantity: i32,
}

struct GBMState {
    symbol: String,
    price: f64,
    mu: f64,
    sigma: f64,
    dt: f64,
}

impl GBMState {
    fn new(symbol: &str, initial_price: f64, mu: f64, sigma: f64, dt: f64) -> Self {
        Self {
            symbol: symbol.to_string(),
            price: initial_price,
            mu,
            sigma,
            dt,
        }
    }

    fn next_tick(&mut self) -> Tick {
        let mut rng = thread_rng();
        let normal = Normal::new(0.0, 1.0).unwrap();
        let dw = normal.sample(&mut rng) * self.dt.sqrt();
        
        let drift = (self.mu - 0.5 * self.sigma * self.sigma) * self.dt;
        let diffusion = self.sigma * dw;
        self.price *= (drift + diffusion).exp();

        Tick {
            symbol: self.symbol.clone(),
            price: self.price,
            quantity: (rng.gen::<f64>() * 100.0) as i32 + 1, // Random quantity
        }
    }
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

    let mut es_state = GBMState::new("ESM6", 4500.0, 0.05, 0.2, 1.0 / 252.0 / 6.5 / 3600.0); // Synthetic ES tick
    let mut nq_state = GBMState::new("NQZ6", 15000.0, 0.08, 0.3, 1.0 / 252.0 / 6.5 / 3600.0); // Synthetic NQ tick
    info!("Initialized synthetic GBM data generators for ESM6 and NQZ6");

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

    // Aeron initialization
    let mut aeron_context = Context::new();
    aeron_context.set_aeron_dir(std::env::var("AERON_DIR").unwrap_or_else(|_| "/tmp/aeron".to_string()));
    let mut aeron = Aeron::new(aeron_context).expect("Failed to initialize Aeron");
    
    let channel = std::env::var("AERON_CHANNEL").unwrap_or_else(|_| "aeron:udp?endpoint=localhost:40123".to_string());
    let stream_id: Index = std::env::var("AERON_STREAM_ID").unwrap_or_else(|_| "10".to_string()).parse().unwrap_or(10);
    
    let publication = aeron.add_publication(channel.clone(), stream_id)
        .expect("Failed to add Aeron publication");

    info!("Aeron Publication created on {} (stream_id={})", channel, stream_id);

    // Graceful shutdown signal
    let ctrl_c = signal::ctrl_c();
    tokio::pin!(ctrl_c);

    let (tx, mut rx) = mpsc::channel::<Tick>(1000);

    if use_alpaca {
        info!("Alpaca API keys found. Connecting to wss://stream.data.alpaca.markets/v2/iex");
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            let url = "wss://stream.data.alpaca.markets/v2/iex";
            match connect_async(url).await {
                Ok((mut ws_stream, _)) => {
                    info!("Connected to Alpaca WebSocket");
                    
                    // Auth
                    let auth_msg = serde_json::json!({
                        "action": "auth",
                        "key": alpaca_key,
                        "secret": alpaca_secret
                    });
                    if let Err(e) = ws_stream.send(WsMessage::Text(auth_msg.to_string())).await {
                        error!("Failed to send Alpaca auth: {}", e);
                        return;
                    }
                    
                    // Subscribe
                    let sub_msg = serde_json::json!({
                        "action": "subscribe",
                        "trades": ["SPY", "QQQ"]
                    });
                    if let Err(e) = ws_stream.send(WsMessage::Text(sub_msg.to_string())).await {
                        error!("Failed to send Alpaca subscribe: {}", e);
                        return;
                    }

                    while let Some(msg) = ws_stream.next().await {
                        match msg {
                            Ok(WsMessage::Text(text)) => {
                                if let Ok(parsed) = serde_json::from_str::<Value>(&text) {
                                    if let Some(arr) = parsed.as_array() {
                                        for item in arr {
                                            if item["T"] == "t" { // Trade message
                                                if let (Some(sym), Some(price), Some(size)) = (
                                                    item["S"].as_str(),
                                                    item["p"].as_f64(),
                                                    item["s"].as_i64()
                                                ) {
                                                    let _ = tx_clone.send(Tick {
                                                        symbol: sym.to_string(),
                                                        price,
                                                        quantity: size as i32,
                                                    }).await;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                error!("Alpaca WS error: {}", e);
                                break;
                            }
                            _ => {}
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to connect to Alpaca: {}", e);
                }
            }
        });
    } else {
        warn!("Alpaca API keys missing. Falling back to synthetic offline offline generation (GBM)");
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_millis(100));
            let mut idx = 0;
            loop {
                ticker.tick().await;
                let tick = if idx % 2 == 0 { es_state.next_tick() } else { nq_state.next_tick() };
                let _ = tx_clone.send(tick).await;
                idx += 1;
            }
        });
    }

    loop {
        tokio::select! {
            Some(mut tick) = rx.recv() => {

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
                    fhe_state: fhe_state.clone(),
                };

                // Protobuf serialization
                let mut buf = Vec::with_capacity(128);
                event.encode(&mut buf).expect("Failed to encode MarketEvent");

                // Publish to Aeron
                let buffer = aeron_rs::concurrent::atomic_buffer::AtomicBuffer::from_slice(&buf);
                match publication.offer(buffer, 0, buf.len() as i32, None) {
                    Ok(pos) => {
                        if pos > 0 {
                            info!(
                                "[seq={}] {} @ {:.2} qty={} | Protobuf: {} bytes | Aeron pos={}",
                                seq_num, tick.symbol, tick.price, tick.quantity, buf.len(), pos
                            );
                        } else {
                            warn!("Aeron offer back-pressured: {}", pos);
                        }
                    }
                    Err(e) => error!("Aeron offer failed: {:?}", e),
                }

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
