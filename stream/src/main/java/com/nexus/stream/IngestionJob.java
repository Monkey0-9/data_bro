package com.nexus.stream;

import io.aeron.Aeron;
import io.aeron.Subscription;
import io.aeron.logbuffer.FragmentHandler;
import org.agrona.DirectBuffer;
import org.agrona.concurrent.IdleStrategy;
import org.agrona.concurrent.SleepingIdleStrategy;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import io.questdb.client.Sender;

public class IngestionJob {

    // MarketEvent to represent the protobuf
    public static class MarketEvent {
        public String symbol;
        public long exchangeTimestamp;
        public long ingestionTimestamp;
        public double price;
        public int quantity;

        public MarketEvent() {}
    }

    // Zero-Copy Aeron Source with DirectBuffer
    public static class AeronSource implements SourceFunction<MarketEvent> {
        private volatile boolean isRunning = true;
        private Aeron aeron;
        private Subscription subscription;
        private static final String CHANNEL = "aeron:udp?endpoint=localhost:40123";
        private static final int STREAM_ID = 10;

        @Override
        public void run(SourceContext<MarketEvent> ctx) throws Exception {
            // Aeron context with zero-copy configuration
            Aeron.Context aeronContext = new Aeron.Context();
            aeron = Aeron.connect(aeronContext);
            subscription = aeron.addSubscription(CHANNEL, STREAM_ID);

            // Idle strategy for polling
            IdleStrategy idleStrategy = new SleepingIdleStrategy();

            // Fragment handler for zero-copy buffer processing
            FragmentHandler handler = (buffer, offset, length, header) -> {
                // Zero-copy read from DirectBuffer
                int symbolLength = buffer.getInt(offset);
                byte[] symbolBytes = new byte[symbolLength];
                buffer.getBytes(offset + 4, symbolBytes);
                String symbol = new String(symbolBytes);

                long exchangeTimestamp = buffer.getLong(offset + 4 + symbolLength);
                long ingestionTimestamp = buffer.getLong(offset + 12 + symbolLength);
                double price = buffer.getDouble(offset + 20 + symbolLength);
                int quantity = buffer.getInt(offset + 28 + symbolLength);

                MarketEvent event = new MarketEvent();
                event.symbol = symbol;
                event.exchangeTimestamp = exchangeTimestamp;
                event.ingestionTimestamp = ingestionTimestamp;
                event.price = price;
                event.quantity = quantity;

                ctx.collectWithTimestamp(event, event.exchangeTimestamp);
            };

            while (isRunning) {
                // Poll with zero-copy - no data copying
                int fragmentsRead = subscription.poll(handler, 10);
                idleStrategy.idle(fragmentsRead);
            }
        }

        @Override
        public void cancel() {
            isRunning = false;
            if (subscription != null) {
                subscription.close();
            }
            if (aeron != null) {
                aeron.close();
            }
        }
    }

    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        System.out.println("Starting NEXUS Flink Stream Processor with Zero-Copy Aeron...");

        DataStream<MarketEvent> stream = env.addSource(new AeronSource())
            .assignTimestampsAndWatermarks(
                WatermarkStrategy.<MarketEvent>forMonotonousTimestamps()
                    .withTimestampAssigner((event, timestamp) -> event.exchangeTimestamp)
            );

        stream.map(event -> {
            // QuestDB Sink with ILP
            try (Sender sender = Sender.builder().address("questdb:9009").build()) {
                sender.table("ticks")
                      .symbol("symbol", event.symbol)
                      .doubleColumn("price", event.price)
                      .longColumn("quantity", event.quantity)
                      .at(event.exchangeTimestamp * 1000000); // Nanoseconds
            }
            return "Wrote " + event.symbol + " @ " + event.price + " to QuestDB (zero-copy)";
        }).print();

        env.execute("Nexus Ingestion Job");
    }
}
