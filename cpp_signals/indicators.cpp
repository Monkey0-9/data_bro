#include <vector>
#include <cmath>
#include <numeric>
#include <algorithm>

// C++ Signal Core - High-performance technical indicators
// Compiled for maximum throughput in HFT environments

class Indicator {
public:
    virtual ~Indicator() = default;
    virtual double update(double price) = 0;
};

class RSI : public Indicator {
private:
    std::vector<double> prices;
    int period;
    double prev_gain;
    double prev_loss;

public:
    RSI(int p = 14) : period(p), prev_gain(0.0), prev_loss(0.0) {}

    double update(double price) override {
        prices.push_back(price);
        if (prices.size() > period + 1) {
            prices.erase(prices.begin());
        }

        if (prices.size() < period + 1) {
            return 50.0; // Neutral
        }

        // Calculate gains and losses
        double gain = 0.0;
        double loss = 0.0;
        for (size_t i = 1; i < prices.size(); ++i) {
            double change = prices[i] - prices[i-1];
            if (change > 0) {
                gain += change;
            } else {
                loss -= change;
            }
        }

        // Smoothed moving average
        double avg_gain = (prev_gain * (period - 1) + gain) / period;
        double avg_loss = (prev_loss * (period - 1) + loss) / period;
        prev_gain = avg_gain;
        prev_loss = avg_loss;

        if (avg_loss == 0.0) {
            return 100.0;
        }

        double rs = avg_gain / avg_loss;
        double rsi = 100.0 - (100.0 / (1.0 + rs));
        return rsi;
    }
};

class SMA : public Indicator {
private:
    std::vector<double> prices;
    int period;

public:
    SMA(int p = 20) : period(p) {}

    double update(double price) override {
        prices.push_back(price);
        if (prices.size() > period) {
            prices.erase(prices.begin());
        }

        if (prices.size() < period) {
            return price;
        }

        double sum = std::accumulate(prices.begin(), prices.end(), 0.0);
        return sum / prices.size();
    }
};

class EMA : public Indicator {
private:
    std::vector<double> prices;
    int period;
    double multiplier;

public:
    EMA(int p = 20) : period(p), multiplier(2.0 / (period + 1)) {}

    double update(double price) override {
        prices.push_back(price);
        if (prices.size() > period) {
            prices.erase(prices.begin());
        }

        if (prices.size() < period) {
            return price;
        }

        double ema = prices[0];
        for (size_t i = 1; i < prices.size(); ++i) {
            ema = (prices[i] * multiplier) + (ema * (1.0 - multiplier));
        }
        return ema;
    }
};

// Signal generation based on indicators
extern "C" {
    // Calculate RSI for a price series
    double calculate_rsi(const double* prices, int length, int period) {
        if (length < period + 1) return 50.0;
        
        double gain = 0.0;
        double loss = 0.0;
        for (int i = 1; i <= period; ++i) {
            double change = prices[i] - prices[i-1];
            if (change > 0) gain += change;
            else loss -= change;
        }
        
        double avg_gain = gain / period;
        double avg_loss = loss / period;
        
        if (avg_loss == 0.0) return 100.0;
        double rs = avg_gain / avg_loss;
        return 100.0 - (100.0 / (1.0 + rs));
    }

    // Calculate SMA for a price series
    double calculate_sma(const double* prices, int length, int period) {
        if (length < period) return prices[length-1];
        
        double sum = 0.0;
        for (int i = length - period; i < length; ++i) {
            sum += prices[i];
        }
        return sum / period;
    }

    // Generate trading signal (1=BUY, -1=SELL, 0=HOLD)
    int generate_signal(const double* prices, int length, int rsi_period, int sma_period) {
        double rsi = calculate_rsi(prices, length, rsi_period);
        double sma = calculate_sma(prices, length, sma_period);
        double current_price = prices[length-1];
        
        // Simple strategy: RSI + price vs SMA
        if (rsi < 30 && current_price > sma) {
            return 1; // BUY
        } else if (rsi > 70 && current_price < sma) {
            return -1; // SELL
        }
        return 0; // HOLD
    }
}
