import { create } from 'zustand';

export interface SignalData {
  symbol: string;
  timestamp: string;
  price: number;
  volume: number;
  sentiment_score: number;
  momentum_signal: string;
  confidence: number;
  equilibrium_score: number;
  suggested_action: string;
}

interface SignalState {
  signal: SignalData | null;
  loading: boolean;
  error: string | null;
  setSignal: (signal: SignalData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signal: null,
  loading: false,
  error: null,
  setSignal: (signal) => set({ signal, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
