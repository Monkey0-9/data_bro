import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import redis.asyncio as redis
import onnxruntime as ort
from transformers import AutoTokenizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentiment-onnx")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class SentimentModel:
    def __init__(self):
        # Scaffold: In production, load actual quantized ONNX model
        self.tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        logger.info(f"Initializing ONNX runtime with providers: {providers}")
        # self.session = ort.InferenceSession("model_quantized.onnx", providers=providers)

    def predict(self, text: str) -> float:
        # Scaffold: ONNX inference logic goes here
        # Return mock score for scaffolding
        return 0.75

model = SentimentModel()
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = redis.from_url(REDIS_URL)
    asyncio.create_task(consume_redis_stream())
    yield
    if redis_client:
        await redis_client.close()

app = FastAPI(title="NEXUS FinBERT ONNX Sentiment API", lifespan=lifespan)

class Headline(BaseModel):
    id: str
    text: str

async def consume_redis_stream():
    """Consume headlines from Redis stream and push scores back."""
    logger.info("Starting Redis stream consumer for headlines...")
    
    # Create consumer group if not exists
    try:
        if redis_client:
            await redis_client.xgroup_create("headlines", "sentiment_group", id="$", mkstream=True)
    except redis.ResponseError as e:
        if "BUSYGROUP" not in str(e):
            logger.error(f"Error creating group: {e}")

    while True:
        try:
            if not redis_client:
                await asyncio.sleep(1)
                continue
                
            # Block and wait for new messages
            messages = await redis_client.xreadgroup(
                "sentiment_group", "consumer-1", 
                {"headlines": ">"}, 
                count=10, block=1000
            )
            
            if messages:
                for stream, msgs in messages:
                    for msg_id, data in msgs:
                        text = data.get(b"text", b"").decode("utf-8")
                        headline_id = data.get(b"id", b"").decode("utf-8")
                        
                        score = model.predict(text)
                        logger.info(f"Scored headline {headline_id}: {score}")
                        
                        # Publish back to a result stream
                        await redis_client.xadd(
                            "sentiment_scores", 
                            {"id": headline_id, "score": str(score)}
                        )
                        
                        # Acknowledge
                        await redis_client.xack("headlines", "sentiment_group", msg_id)
        except Exception as e:
            logger.error(f"Error in stream consumer: {e}")
            await asyncio.sleep(1)

@app.post("/analyze")
async def analyze_sentiment(headline: Headline):
    """REST endpoint for direct sentiment analysis."""
    score = model.predict(headline.text)
    return {"id": headline.id, "score": score}

@app.get("/health")
async def health():
    return {"status": "ok", "onnx_providers": ort.get_available_providers()}
