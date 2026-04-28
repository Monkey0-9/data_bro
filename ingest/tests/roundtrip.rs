pub mod market_data {
    include!(concat!(env!("OUT_DIR"), "/nexus.market_data.rs"));
}

use market_data::{EventType, MarketEvent};
use prost::Message;

#[test]
fn test_encode_decode_roundtrip() {
    let event = MarketEvent {
        symbol: "ESM6".to_string(),
        exchange_timestamp: 1710000000000,
        ingestion_timestamp: 1710000000005,
        event_type: EventType::Trade as i32,
        price: 4500.25,
        quantity: 10,
    };

    let mut buf = Vec::new();
    event.encode(&mut buf).unwrap();

    let decoded = MarketEvent::decode(&*buf).unwrap();
    assert_eq!(decoded.symbol, "ESM6");
    assert_eq!(decoded.price, 4500.25);
    assert_eq!(decoded.quantity, 10);
}
