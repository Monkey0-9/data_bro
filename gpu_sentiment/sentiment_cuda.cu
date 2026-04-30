#include <cuda_runtime.h>
#include <cuda.h>
#include <stdio.h>

// CUDA-accelerated sentiment analysis
// Offloads batch text processing to GPU for parallel inference

__global__ void sentiment_score_kernel(float* scores, const float* embeddings, int batch_size, int embedding_dim) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < batch_size) {
        // Simple dot product sentiment scoring on GPU
        float sum = 0.0f;
        for (int i = 0; i < embedding_dim; ++i) {
            sum += embeddings[idx * embedding_dim + i];
        }
        scores[idx] = tanh(sum / embedding_dim); // Normalize to [-1, 1]
    }
}

extern "C" {
    // Launch CUDA kernel for batch sentiment scoring
    void cuda_sentiment_batch(float* d_scores, const float* d_embeddings, int batch_size, int embedding_dim) {
        int threads_per_block = 256;
        int blocks_per_grid = (batch_size + threads_per_block - 1) / threads_per_block;
        
        sentiment_score_kernel<<<blocks_per_grid, threads_per_block>>>(
            d_scores, d_embeddings, batch_size, embedding_dim
        );
        
        cudaError_t err = cudaGetLastError();
        if (err != cudaSuccess) {
            printf("CUDA error: %s\n", cudaGetErrorString(err));
        }
        
        cudaDeviceSynchronize();
    }

    // Allocate GPU memory
    void* cuda_allocate(size_t size) {
        void* ptr;
        cudaMalloc(&ptr, size);
        return ptr;
    }

    // Free GPU memory
    void cuda_free(void* ptr) {
        cudaFree(ptr);
    }

    // Copy data to GPU
    void cuda_copy_to_gpu(void* dst, const void* src, size_t size) {
        cudaMemcpy(dst, src, size, cudaMemcpyHostToDevice);
    }

    // Copy data from GPU
    void cuda_copy_from_gpu(void* dst, const void* src, size_t size) {
        cudaMemcpy(dst, src, size, cudaMemcpyDeviceToHost);
    }
}
