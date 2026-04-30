#!/bin/bash
# Compile CUDA sentiment analysis library

nvcc -shared -Xcompiler -fPIC sentiment_cuda.cu -o libsentiment_cuda.so

echo "CUDA library compiled successfully"
