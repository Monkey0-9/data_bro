---
wave: 1
depends_on: []
files_modified:
  - WORKSPACE
  - ingest/Cargo.toml
  - ingest/src/main.rs
  - stream/pom.xml
  - stream/src/main/java/com/nexus/stream/IngestionJob.java
  - proto/market_data.proto
  - k8s/ingestion-pod.yaml
  - docker-compose.yml
autonomous: true
requirements_addressed: [INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05, INGEST-06, INGEST-07, INGEST-08, INFRA-01, INFRA-02, INFRA-04]
---

# Phase 1: Ingestion Backbone Implementation

<objective>
Implement the core data ingestion pipeline for CME MDP 3.0 data. This includes setting up the Bazel monorepo, creating the Rust SBE decoder, implementing the Flink streaming topology, and setting up the QuestDB sink.
</objective>

<tasks>
<task>
  <description>Initialize Bazel monorepo workspace and proto definitions</description>
  <read_first>
    - .planning/phases/01-ingestion-backbone/01-RESEARCH.md
  </read_first>
  <action>
    Create a `WORKSPACE` file at the project root with the necessary rules for Rust (`rules_rust`), Java (`rules_java`), and Protobuf (`rules_proto`).
    Create `proto/market_data.proto` defining a `MarketEvent` message containing fields: `symbol` (string), `exchange_timestamp` (uint64), `ingestion_timestamp` (uint64), `event_type` (enum: TRADE, QUOTE), `price` (double), `quantity` (int32).
    Create a `BUILD.bazel` file in the `proto` directory to compile the protobufs.
  </action>
  <acceptance_criteria>
    - File `WORKSPACE` exists.
    - File `proto/market_data.proto` contains `message MarketEvent`.
    - Bazel build command for protos succeeds (conceptually).
  </acceptance_criteria>
</task>

<task>
  <description>Create Rust SBE Decoder and Aeron Publisher</description>
  <read_first>
    - .planning/phases/01-ingestion-backbone/01-RESEARCH.md
  </read_first>
  <action>
    Create a Rust project in the `ingest` directory.
    Write `ingest/Cargo.toml` including dependencies: `tokio`, `prost` (for protobuf), `aeron-rs` (conceptual or mock if unavailable), and `sbe-rs`.
    Create `ingest/src/main.rs`. Implement a mock UDP listener that generates dummy CME MDP 3.0 packets for ES/NQ.
    Implement a decoder that parses these packets into `MarketEvent` protobuf structs.
    Implement an Aeron publisher that sends these protobuf structs over IPC.
    Include a sequence gap detection mechanism that logs a warning if a sequence number is skipped.
  </action>
  <acceptance_criteria>
    - `ingest/Cargo.toml` contains `tokio` and `prost`.
    - `ingest/src/main.rs` contains a `tokio::net::UdpSocket` loop.
    - `ingest/src/main.rs` contains Aeron publishing logic.
  </acceptance_criteria>
</task>

<task>
  <description>Create Flink Streaming Topology and QuestDB Sink</description>
  <read_first>
    - .planning/phases/01-ingestion-backbone/01-RESEARCH.md
  </read_first>
  <action>
    Create a Maven/Java project in the `stream` directory for Apache Flink.
    Write `stream/pom.xml` with dependencies for `flink-streaming-java`, `flink-clients`, and QuestDB ILP client (`questdb`).
    Create `stream/src/main/java/com/nexus/stream/IngestionJob.java`.
    Implement a Flink Source that reads from Aeron IPC (mocked or stubbed if necessary).
    Implement an order book state machine using Flink's `ValueState`.
    Implement a 1-minute tumbling window to aggregate `MarketEvent` ticks into OHLCV bars based on `exchange_timestamp`.
    Implement a QuestDB sink using the InfluxDB Line Protocol to write raw ticks and OHLCV bars.
  </action>
  <acceptance_criteria>
    - `stream/pom.xml` contains `flink-streaming-java`.
    - `stream/src/main/java/com/nexus/stream/IngestionJob.java` contains `StreamExecutionEnvironment.getExecutionEnvironment()`.
    - `IngestionJob.java` contains QuestDB ILP writing logic.
  </acceptance_criteria>
</task>

<task>
  <description>Create Infrastructure Deployment Manifests</description>
  <read_first>
    - .planning/phases/01-ingestion-backbone/01-RESEARCH.md
  </read_first>
  <action>
    Create `k8s/ingestion-pod.yaml` defining a Kubernetes Pod with two containers: `rust-ingest` and `flink-taskmanager`.
    Configure an `emptyDir` volume mounted at `/dev/shm` in both containers to enable Aeron IPC shared memory.
    Create a `docker-compose.yml` at the project root to spin up QuestDB, the Rust ingestion service, and a local Flink cluster for development testing.
  </action>
  <acceptance_criteria>
    - `k8s/ingestion-pod.yaml` exists and contains an `emptyDir` volume.
    - `k8s/ingestion-pod.yaml` contains both `rust-ingest` and `flink-taskmanager` containers.
    - `docker-compose.yml` includes a `questdb` service.
  </acceptance_criteria>
</task>
</tasks>

<must_haves>
- The Rust application must compile and include UDP listening and IPC publishing logic.
- The Java application must compile and include Flink streaming and QuestDB sinking logic.
- K8s and Docker configurations must properly link the services.
</must_haves>
