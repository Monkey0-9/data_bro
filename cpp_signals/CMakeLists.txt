cmake_minimum_required(VERSION 3.10)
project(nexus_cpp_signals)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build shared library
add_library(indicators SHARED indicators.cpp)

# Build executable for testing
add_executable(signal_test test.cpp)
target_link_libraries(signal_test indicators)
