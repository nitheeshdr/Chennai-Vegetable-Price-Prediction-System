import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface Props {
  data: any;
}

// Small 2x2 widget — shows top rising vegetable
export function VegPriceWidget({ data }: Props) {
  const top = data?.top_rising?.[0] ?? data?.all_predictions?.[0];

  if (!top) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent', height: 'match_parent',
          backgroundColor: '#1B1B26', justifyContent: 'center', alignItems: 'center',
          borderRadius: 20,
        }}
      >
        <TextWidget text="VegPrice AI" style={{ color: '#BBC2FF', fontSize: 13, fontWeight: 'bold' }} />
        <TextWidget text="Loading…" style={{ color: '#666685', fontSize: 11 }} />
      </FlexWidget>
    );
  }

  const name       = top.vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const trendColor = top.trend === 'up' ? '#FFB4AB' : top.trend === 'down' ? '#A8F0C6' : '#F5C842';
  const trendLabel = top.trend === 'up' ? '↑ Rising' : top.trend === 'down' ? '↓ Falling' : '→ Stable';
  const changePct  = top.change_pct != null
    ? `${top.change_pct > 0 ? '+' : ''}${top.change_pct}%`
    : '';

  return (
    <FlexWidget
      style={{
        width: 'match_parent', height: 'match_parent',
        backgroundColor: '#1B1B26', flexDirection: 'column',
        justifyContent: 'space-between', padding: 14, borderRadius: 20,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="VegPrice AI" style={{ color: '#BBC2FF', fontSize: 10, fontWeight: 'bold' }} />
        <TextWidget text={trendLabel} style={{ color: trendColor, fontSize: 10, fontWeight: 'bold' }} />
      </FlexWidget>

      {/* Price */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={name} style={{ color: '#E8E8FF', fontSize: 13, fontWeight: 'bold' }} />
        <TextWidget
          text={`₹${top.predicted_price.toFixed(0)}/kg`}
          style={{ color: trendColor, fontSize: 26, fontWeight: 'bold' }}
        />
        {changePct ? (
          <TextWidget text={changePct} style={{ color: trendColor, fontSize: 11 }} />
        ) : null}
      </FlexWidget>

      {/* Footer */}
      <TextWidget text="Tomorrow's price · Chennai" style={{ color: '#45455C', fontSize: 9 }} />
    </FlexWidget>
  );
}
