import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change to your local machine's IP when testing on physical device
const BASE_URL = __DEV__ ? 'http://10.180.205.161:8000' : 'https://api.vegprice.app';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PredictionResponse {
  vegetable: string;
  prediction_date: string;
  current_price: number | null;
  predicted_price: number;
  confidence_lower: number;
  confidence_upper: number;
  trend: 'up' | 'down' | 'stable';
  trend_emoji: string;
  model_name: string;
}

export interface CurrentPriceResponse {
  vegetable: string;
  date: string;
  market_name: string | null;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  unit: string;
}

export interface ScanResponse {
  vegetable_detected: string;
  confidence: number;
  top_k: Array<{ vegetable: string; confidence: number }>;
  prediction: PredictionResponse | null;
  current_price: CurrentPriceResponse | null;
}

export interface WeeklyForecastResponse {
  vegetable: string;
  market: string | null;
  forecast: PredictionResponse[];
}

export interface DashboardResponse {
  total_vegetables: number;
  markets_tracked: number;
  last_updated: string;
  top_rising: Array<{ vegetable: string; change_pct: number; predicted_price: number }>;
  top_falling: Array<{ vegetable: string; change_pct: number; predicted_price: number }>;
  all_predictions: PredictionResponse[];
}

// ── API functions ─────────────────────────────────────────────────────────────
export const api = {
  async predict(vegetable: string, market?: string): Promise<PredictionResponse> {
    const params: Record<string, string> = { vegetable };
    if (market) params.market = market;
    const { data } = await apiClient.get('/predict', { params });
    return data;
  },

  async getCurrentPrice(vegetable: string, market?: string): Promise<CurrentPriceResponse> {
    const params: Record<string, string> = { vegetable };
    if (market) params.market = market;
    const { data } = await apiClient.get('/get-current-price', { params });
    return data;
  },

  async scanImage(imageUri: string): Promise<ScanResponse> {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'vegetable.jpg',
    } as any);
    const { data } = await apiClient.post('/scan-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async getWeeklyForecast(vegetable: string, market?: string): Promise<WeeklyForecastResponse> {
    const params: Record<string, string> = { vegetable };
    if (market) params.market = market;
    const { data } = await apiClient.get('/weekly-forecast', { params });
    return data;
  },

  async getDashboard(): Promise<DashboardResponse> {
    const { data } = await apiClient.get('/dashboard');
    return data;
  },

  async createAlert(payload: {
    user_id: string;
    vegetable_name: string;
    threshold_price: number;
    direction: 'above' | 'below';
    market_name?: string;
    device_token?: string;
  }) {
    const { data } = await apiClient.post('/alerts', payload);
    return data;
  },

  async getAlerts(userId: string) {
    const { data } = await apiClient.get(`/alerts/${userId}`);
    return data;
  },

  async deleteAlert(alertId: string) {
    await apiClient.delete(`/alerts/${alertId}`);
  },

  async getMarketComparison(vegetable: string) {
    const { data } = await apiClient.get('/get-current-price/market-comparison', {
      params: { vegetable },
    });
    return data;
  },
};
