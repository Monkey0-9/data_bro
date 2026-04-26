pub mod market_data {
    include!(concat!(env!("OUT_DIR"), "/nexus.market_data.rs"));
}

use market_data::{MarketEvent, EventType};
use prost::Message;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::UdpSocket;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting NEXUS Rust Ingestion Service...");

    // Mock Aeron Publisher setup
    println!("Initializing Aeron IPC publisher on aeron:ipc...");

    // UDP Listener setup
    let socket = UdpSocket::bind("0.0.0.0:0").await?;
    println!("Listening for UDP multicast (simulated) on port {}", socket.local_addr()?.port());

    let mut buf = [0; 1024];
    let mut expected_seq_num: u64 = 1;

    // Simulation loop
    loop {
        // In a real scenario, this would await socket.recv_from(&mut buf)
        // Here we simulate receiving a CME packet.
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let seq_num = expected_seq_num; // Simulate perfect delivery
        expected_seq_num += 1;

        if seq_num != expected_seq_num - 1 {
            eprintln!("WARNING: Sequence gap detected. Expected {}, got {}", expected_seq_num - 1, seq_num);
            // In a real system, trigger TCP replay here
        }

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let event = MarketEvent {
            symbol: "ESM6".to_string(),
            exchange_timestamp: current_time - 5, // 5ms simulated latency from exchange
            ingestion_timestamp: current_time,
            event_type: EventType::Trade as i32,
            price: 4500.25,
            quantity: 10,
        };

        // Encode using prost
        let mut encoded = Vec::new();
        event.encode(&mut encoded)?;

        // In a real system: aeron_publisher.offer(&encoded)
        println!("Published event: {} @ {} ({} bytes)", event.symbol, event.price, encoded.len());
    }
}
