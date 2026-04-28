pub mod market_data {
    include!(concat!(env!("OUT_DIR"), "/nexus.market_data.rs"));
}

use market_data::{EventType, MarketEvent};
use prost::Message;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::time::{interval, Duration};

#[derive(Debug, Clone)]
struct Tick {
    symbol: String,
    price: f64,
    quantity: i32,
}

fn load_ticks(path: &str) -> Vec<Tick> {
    let content = fs::read_to_string(path).expect("Failed to read tick CSV");
    let mut ticks = Vec::new();
    let mut lines = content.lines();
    lines.next(); // skip header
    for line in lines {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 4 {
            ticks.push(Tick {
                symbol: parts[1].to_string(),
                price: parts[2].parse().unwrap_or(0.0),
                quantity: parts[3].parse().unwrap_or(0),
            });
        }
    }
    ticks
}

async fn send_ilp(stream: &mut TcpStream, table: &str, symbol: &str, price: f64, qty: i32, ts: u64) {
    let line = format!("{} symbol={},price={},quantity={} {}\n", table, symbol, price, qty, ts);
    let _ = stream.write_all(line.as_bytes()).await;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting NEXUS Ingestion Service...");

    let csv_path = std::env::var("TICKS_CSV").unwrap_or_else(|_| "data/ticks.csv".to_string());
    let ticks = load_ticks(&csv_path);
    println!("Loaded {} ticks from {}", ticks.len(), csv_path);

    let quest_host = std::env::var("QUESTDB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let quest_port: u16 = std::env::var("QUESTDB_ILP_PORT")
        .unwrap_or_else(|_| "9009".to_string())
        .parse()
        .unwrap_or(9009);

    let mut stream: Option<TcpStream> = None;
    let mut ticker = interval(Duration::from_millis(500));
    let mut idx = 0;
    let mut seq_num: u64 = 1;

    loop {
        ticker.tick().await;

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
            price: tick.price + (seq_num as f64 * 0.01),
            quantity: tick.quantity,
        };

        // Send to QuestDB ILP if connected
        if stream.is_none() {
            match TcpStream::connect((quest_host.as_str(), quest_port)).await {
                Ok(s) => {
                    println!("Connected to QuestDB ILP at {}:{}", quest_host, quest_port);
                    stream = Some(s);
                }
                Err(e) => {
                    println!("QuestDB unavailable ({}:{}) - {}. Skipping ILP.", quest_host, quest_port, e);
                }
            }
        }

        if let Some(ref mut s) = stream {
            send_ilp(s, "ticks", &event.symbol, event.price, event.quantity, now).await;
        }

        // Protobuf encode for downstream consumers
        let mut encoded = Vec::new();
        event.encode(&mut encoded)?;

        println!(
            "[seq={}] {} @ {:.2} qty={} | {} bytes | ts={}",
            seq_num, event.symbol, event.price, event.quantity, encoded.len(), event.ingestion_timestamp
        );

        seq_num = seq_num.wrapping_add(1);
    }
}
