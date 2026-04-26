package com.nexus.stream;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
// import io.questdb.client.Sender;

public class IngestionJob {

    // Dummy MarketEvent to represent the protobuf
    public static class MarketEvent {
        public String symbol;
        public long exchangeTimestamp;
        public long ingestionTimestamp;
        public double price;
        public int quantity;

        public MarketEvent() {}
    }

    // Mock Aeron Source
    public static class AeronSource implements SourceFunction<MarketEvent> {
        private volatile boolean isRunning = true;

        @Override
        public void run(SourceContext<MarketEvent> ctx) throws Exception {
            long seq = 0;
            while (isRunning) {
                MarketEvent event = new MarketEvent();
                event.symbol = "ESM6";
                event.exchangeTimestamp = System.currentTimeMillis() - 5;
                event.ingestionTimestamp = System.currentTimeMillis();
                event.price = 4500.25 + (Math.random() - 0.5);
                event.quantity = 10;
                
                ctx.collectWithTimestamp(event, event.exchangeTimestamp);
                
                Thread.sleep(100);
            }
        }

        @Override
        public void cancel() {
            isRunning = false;
        }
    }

    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        System.out.println("Starting NEXUS Flink Stream Processor...");

        DataStream<MarketEvent> stream = env.addSource(new AeronSource())
            .assignTimestampsAndWatermarks(
                WatermarkStrategy.<MarketEvent>forMonotonousTimestamps()
                    .withTimestampAssigner((event, timestamp) -> event.exchangeTimestamp)
            );

        stream.map(event -> {
            // Mock QuestDB Sink Logic
            // try (Sender sender = Sender.builder().address("questdb:9009").build()) {
            //     sender.table("ticks")
            //           .symbol("symbol", event.symbol)
            //           .doubleColumn("price", event.price)
            //           .longColumn("qty", event.quantity)
            //           .at(event.exchangeTimestamp * 1000000); // Nanoseconds
            // }
            return "Wrote " + event.symbol + " @ " + event.price + " to QuestDB";
        }).print();

        env.execute("Nexus Ingestion Job");
    }
}
