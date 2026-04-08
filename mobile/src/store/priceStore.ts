import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, PredictionResponse, DashboardResponse } from '../services/api';

interface PriceStore {
  predictions: Record<string, PredictionResponse>;
  dashboard: DashboardResponse | null;
  selectedMarket: string | null;
  isLoading: boolean;
  error: string | null;

  fetchPrediction: (vegetable: string, market?: string) => Promise<void>;
  fetchDashboard: () => Promise<void>;
  setMarket: (market: string | null) => void;
  clearError: () => void;
}

export const usePriceStore = create<PriceStore>()(
  persist(
    (set, get) => ({
      predictions: {},
      dashboard: null,
      selectedMarket: 'koyambedu',
      isLoading: false,
      error: null,

      fetchPrediction: async (vegetable, market) => {
        set({ isLoading: true, error: null });
        try {
          const pred = await api.predict(vegetable, market);
          set(state => ({
            predictions: { ...state.predictions, [vegetable]: pred },
            isLoading: false,
          }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      fetchDashboard: async () => {
        set({ isLoading: true, error: null });
        try {
          const dashboard = await api.getDashboard();
          set({ dashboard, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      setMarket: (market) => set({ selectedMarket: market }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'vegprice-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        predictions: state.predictions,
        selectedMarket: state.selectedMarket,
      }),
    }
  )
);
