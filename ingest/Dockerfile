FROM rust:1.77-slim as builder

WORKDIR /app
COPY Cargo.toml build.rs ./
COPY proto ../proto
COPY src ./src
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/nexus-ingest /app/nexus-ingest
COPY data/ticks.csv /app/data/ticks.csv
ENV RUST_LOG=info
CMD ["./nexus-ingest"]
