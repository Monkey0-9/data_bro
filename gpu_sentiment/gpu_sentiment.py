import os
import ctypes
import numpy as np
from typing import List

# Python wrapper for CUDA-accelerated sentiment analysis
# Requires CUDA toolkit and compiled .so/.dll library

CUDA_LIB_PATH = os.environ.get("CUDA_LIB_PATH", "./libsentiment_cuda.so")

try:
    cuda_lib = ctypes.CDLL(CUDA_LIB_PATH)
    
    # Define function signatures
    cuda_lib.cuda_sentiment_batch.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_int,
        ctypes.c_int
    ]
    
    cuda_lib.cuda_allocate.argtypes = [ctypes.c_size_t]
    cuda_lib.cuda_allocate.restype = ctypes.c_void_p
    
    cuda_lib.cuda_free.argtypes = [ctypes.c_void_p]
    
    cuda_lib.cuda_copy_to_gpu.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
    cuda_lib.cuda_copy_from_gpu.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_size_t]
    
    CUDA_AVAILABLE = True
except Exception as e:
    print(f"CUDA not available: {e}")
    CUDA_AVAILABLE = False


class GPUSentimentAnalyzer:
    """GPU-accelerated sentiment analysis using CUDA."""
    
    def __init__(self, embedding_dim: int = 768):
        self.embedding_dim = embedding_dim
        self.cuda_available = CUDA_AVAILABLE
        
    def batch_score(self, embeddings: np.ndarray) -> np.ndarray:
        """
        Score sentiment for a batch of text embeddings using GPU.
        
        Args:
            embeddings: numpy array of shape (batch_size, embedding_dim)
            
        Returns:
            scores: numpy array of shape (batch_size,) with values in [-1, 1]
        """
        if not self.cuda_available:
            # Fallback to CPU
            return np.mean(embeddings, axis=1)
        
        batch_size = embeddings.shape[0]
        embeddings_flat = embeddings.flatten().astype(np.float32)
        
        # Allocate GPU memory
        d_embeddings = cuda_lib.cuda_allocate(embeddings_flat.nbytes)
        d_scores = cuda_lib.cuda_allocate(batch_size * 4)  # float32
        
        # Copy to GPU
        cuda_lib.cuda_copy_to_gpu(d_embeddings, embeddings_flat.ctypes.data, embeddings_flat.nbytes)
        
        # Launch kernel
        cuda_lib.cuda_sentiment_batch(d_scores, d_embeddings, batch_size, self.embedding_dim)
        
        # Copy results back
        scores = np.zeros(batch_size, dtype=np.float32)
        cuda_lib.cuda_copy_from_gpu(scores.ctypes.data, d_scores, scores.nbytes)
        
        # Free GPU memory
        cuda_lib.cuda_free(d_embeddings)
        cuda_lib.cuda_free(d_scores)
        
        return scores
    
    def __del__(self):
        pass


# Fallback CPU implementation
class CPUSentimentAnalyzer:
    """CPU-based sentiment analysis fallback."""
    
    def __init__(self, embedding_dim: int = 768):
        self.embedding_dim = embedding_dim
    
    def batch_score(self, embeddings: np.ndarray) -> np.ndarray:
        """Simple mean-based sentiment scoring on CPU."""
        return np.mean(embeddings, axis=1)


def get_sentiment_analyzer(use_gpu: bool = True) -> GPUSentimentAnalyzer | CPUSentimentAnalyzer:
    """Get appropriate sentiment analyzer based on GPU availability."""
    if use_gpu and CUDA_AVAILABLE:
        return GPUSentimentAnalyzer()
    return CPUSentimentAnalyzer()


if __name__ == "__main__":
    # Test with dummy embeddings
    analyzer = get_sentiment_analyzer()
    embeddings = np.random.randn(100, 768).astype(np.float32)
    scores = analyzer.batch_score(embeddings)
    print(f"Computed {len(scores)} sentiment scores")
    print(f"Mean score: {scores.mean():.4f}")
