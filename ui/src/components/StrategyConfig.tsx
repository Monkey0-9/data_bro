import { useState } from 'react';

interface StrategyConfigProps {
  onSave: (config: StrategyConfig) => void;
}

interface StrategyConfig {
  name: string;
  rsiPeriod: number;
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  smaPeriod: number;
  positionSize: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositions: number;
}

export const StrategyConfig: React.FC<StrategyConfigProps> = ({ onSave }) => {
  const [config, setConfig] = useState<StrategyConfig>({
    name: 'RSI Momentum',
    rsiPeriod: 14,
    rsiBuyThreshold: 30,
    rsiSellThreshold: 70,
    smaPeriod: 20,
    positionSize: 1.0,
    stopLossPercent: 2.0,
    takeProfitPercent: 5.0,
    maxPositions: 5,
  });

  const handleChange = (field: keyof StrategyConfig, value: number | string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #374151',
        width: '100%',
      }}
    >
      <h3 style={{ color: '#60a5fa', marginBottom: '16px', fontSize: '18px' }}>
        Strategy Configuration
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Strategy Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            RSI Period
          </label>
          <input
            type="number"
            value={config.rsiPeriod}
            onChange={(e) => handleChange('rsiPeriod', parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            RSI Buy Threshold
          </label>
          <input
            type="number"
            value={config.rsiBuyThreshold}
            onChange={(e) => handleChange('rsiBuyThreshold', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            RSI Sell Threshold
          </label>
          <input
            type="number"
            value={config.rsiSellThreshold}
            onChange={(e) => handleChange('rsiSellThreshold', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            SMA Period
          </label>
          <input
            type="number"
            value={config.smaPeriod}
            onChange={(e) => handleChange('smaPeriod', parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Position Size
          </label>
          <input
            type="number"
            step="0.1"
            value={config.positionSize}
            onChange={(e) => handleChange('positionSize', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Stop Loss %
          </label>
          <input
            type="number"
            step="0.1"
            value={config.stopLossPercent}
            onChange={(e) => handleChange('stopLossPercent', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Take Profit %
          </label>
          <input
            type="number"
            step="0.1"
            value={config.takeProfitPercent}
            onChange={(e) => handleChange('takeProfitPercent', parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>

        <div>
          <label style={{ color: '#9ca3af', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
            Max Positions
          </label>
          <input
            type="number"
            value={config.maxPositions}
            onChange={(e) => handleChange('maxPositions', parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              color: '#d1d5db',
            }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{
          marginTop: '16px',
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Save Strategy
      </button>
    </div>
  );
};
