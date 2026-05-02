use tokio;
use tracing::{info, error, Level};
use tracing_subscriber::FmtSubscriber;
use aeron_rs::aeron::Aeron;
use aeron_rs::context::Context;
use aeron_rs::utils::types::Index;
use prost::Message;

pub mod market_data {
    // Include generated protobuf code (mocked for this scaffold)
    #[derive(Clone, PartialEq, ::prost::Message)]
    pub struct MarketEvent {
        #[prost(string, tag="1")]
        pub symbol: ::prost::alloc::string::String,
        #[prost(double, tag="5")]
        pub price: f64,
        #[prost(int32, tag="6")]
        pub quantity: i32,
    }
}

#[tokio::main]
async fn main() {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).ok();

    info!("Starting NEXUS Arroyo Stream Processor (Rust-native)...");

    let mut context = Context::new();
    context.set_aeron_dir(std::env::var("AERON_DIR").unwrap_or_else(|_| "/tmp/aeron".to_string()));
    
    let mut aeron = Aeron::new(context).expect("Failed to init Aeron");
    let channel = std::env::var("AERON_CHANNEL").unwrap_or_else(|_| "aeron:udp?endpoint=localhost:40123".to_string());
    let stream_id: Index = std::env::var("AERON_STREAM_ID").unwrap_or_else(|_| "10".to_string()).parse().unwrap_or(10);

    let subscription = aeron.add_subscription(channel.clone(), stream_id)
        .expect("Failed to add Aeron subscription");

    info!("Subscribed to Aeron stream {} on {}", stream_id, channel);

    let quest_host = std::env::var("QUESTDB_HOST").unwrap_or_else(|_| "questdb".to_string());
    let quest_port = std::env::var("QUESTDB_ILP_PORT").unwrap_or_else(|_| "9009".to_string());
    let quest_addr = format!("{}:{}", quest_host, quest_port);

    let mut quest_stream = match tokio::net::TcpStream::connect(&quest_addr).await {
        Ok(s) => {
            info!("Connected to QuestDB ILP on {}", quest_addr);
            Some(s)
        }
        Err(e) => {
            error!("Failed to connect to QuestDB: {}", e);
            None
        }
    };

    let handler = |buffer: &aeron_rs::concurrent::atomic_buffer::AtomicBuffer, _header: &aeron_rs::aeron::Header| {
        let data = buffer.as_slice();
        match market_data::MarketEvent::decode(data) {
            Ok(event) => {
                info!("Processing event for {}: price={:.2}", event.symbol, event.price);
                
                // Sink to QuestDB via ILP
                if let Some(ref mut s) = quest_stream {
                    let line = format!("ticks,symbol={} price={},quantity={} {}\n", 
                        event.symbol, event.price, event.quantity, 
                        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
                    );
                    // Using blocking write in the handler for now (handler is not async)
                    // In production, use a non-blocking queue.
                    use std::io::Write;
                    let mut stream_ref = s.std().expect("Failed to get std stream");
                    let _ = stream_ref.write_all(line.as_bytes());
                }
            }
            Err(e) => error!("Failed to decode market event: {:?}", e),
        }
    };

    loop {
        subscription.poll(handler, 10);
        tokio::task::yield_now().await;
    }
}
