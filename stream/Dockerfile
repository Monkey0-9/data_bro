FROM rust:1.76-slim-bullseye as builder

WORKDIR /usr/src/app
COPY Cargo.toml .
# Create a dummy main.rs to cache dependencies
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY src ./src
RUN touch src/main.rs
RUN cargo build --release

FROM debian:bullseye-slim
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/nexus-stream /usr/local/bin/nexus-stream
CMD ["nexus-stream"]
