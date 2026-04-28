use std::fs;

#[test]
fn test_ticks_csv_exists() {
    assert!(fs::metadata("../data/ticks.csv").is_ok());
}

#[test]
fn test_csv_parse() {
    let content = fs::read_to_string("../data/ticks.csv").unwrap();
    let mut lines = content.lines();
    let header = lines.next().unwrap();
    assert_eq!(header, "timestamp,symbol,price,quantity");
    
    let line = lines.next().unwrap();
    let parts: Vec<&str> = line.split(',').collect();
    assert_eq!(parts.len(), 4);
    assert!(parts[2].parse::<f64>().is_ok());
    assert!(parts[3].parse::<i32>().is_ok());
}
