import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { VegPriceWidget } from './VegPriceWidget';
import { MarketSummaryWidget } from './MarketSummaryWidget';
import { DashboardWidget } from './DashboardWidget';

const API_BASE = 'https://chennai-vegetable-price-prediction.vercel.app';

async function fetchDashboard(): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${API_BASE}/dashboard`, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetName } = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try {
        const data = await fetchDashboard();
        if (widgetName === 'VegPrice') {
          props.renderWidget(React.createElement(VegPriceWidget, { data }));
        } else if (widgetName === 'MarketSummary') {
          props.renderWidget(React.createElement(MarketSummaryWidget, { data }));
        } else if (widgetName === 'Dashboard') {
          props.renderWidget(React.createElement(DashboardWidget, { data }));
        }
      } catch {
        // On error show last cached state — Android will retry on next updatePeriod
      }
      break;
    }
    case 'WIDGET_DELETED':
      break;
  }
}
