#include <iostream>
#include <vector>

extern "C" {
    double calculate_rsi(const double* prices, int length, int period);
    double calculate_sma(const double* prices, int length, int period);
    int generate_signal(const double* prices, int length, int rsi_period, int sma_period);
}

int main() {
    // Test data
    std::vector<double> prices = {
        100.0, 101.0, 102.0, 103.0, 104.0,
        105.0, 106.0, 107.0, 108.0, 109.0,
        110.0, 111.0, 112.0, 113.0, 114.0,
        115.0, 116.0, 117.0, 118.0, 119.0
    };

    double rsi = calculate_rsi(prices.data(), prices.size(), 14);
    double sma = calculate_sma(prices.data(), prices.size(), 10);
    int signal = generate_signal(prices.data(), prices.size(), 14, 10);

    std::cout << "RSI: " << rsi << std::endl;
    std::cout << "SMA: " << sma << std::endl;
    std::cout << "Signal: " << signal << " (1=BUY, -1=SELL, 0=HOLD)" << std::endl;

    return 0;
}
