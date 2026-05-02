fn main() {
    // Compile Protobuf
    prost_build::compile_protos(&["../proto/market_data.proto"], &["../proto"]).unwrap();

    // Compile FlatBuffers
    flatc_rust::run(flatc_rust::Args {
        inputs: &[std::path::Path::new("../proto/market_event.fbs")],
        out_dir: std::path::Path::new(&std::env::var("OUT_DIR").unwrap()),
        ..Default::args()
    }).expect("FlatBuffers compilation failed");
}
