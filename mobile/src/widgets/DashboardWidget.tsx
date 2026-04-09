import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface Props {
  data: any;
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <FlexWidget
      style={{
        flex: 1, flexDirection: 'column', alignItems: 'center',
        backgroundColor: '#1F1F2B', borderRadius: 10, padding: 8,
      }}
    >
      <TextWidget text={value} style={{ color, fontSize: 18, fontWeight: 'bold' }} />
      <TextWidget text={label} style={{ color: '#666685', fontSize: 9 }} />
    </FlexWidget>
  );
}

function PriceRow({ veg, showArrow }: { veg: any; showArrow: boolean }) {
  const name       = veg.vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const trendColor = veg.trend === 'up' ? '#FFB4AB' : veg.trend === 'down' ? '#A8F0C6' : '#F5C842';
  const arrow      = veg.trend === 'up' ? '↑' : veg.trend === 'down' ? '↓' : '→';
  const pct        = veg.change_pct != null ? ` ${veg.change_pct > 0 ? '+' : ''}${veg.change_pct}%` : '';

  return (
    <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <TextWidget text={name} style={{ color: '#B4B4CC', fontSize: 10 }} />
      <TextWidget
        text={`${arrow} ₹${veg.predicted_price.toFixed(0)}${pct}`}
        style={{ color: trendColor, fontSize: 10, fontWeight: 'bold' }}
      />
    </FlexWidget>
  );
}

// Large 4×4 widget — full dashboard summary
export function DashboardWidget({ data }: Props) {
  if (!data) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent', height: 'match_parent',
          backgroundColor: '#1B1B26', justifyContent: 'center', alignItems: 'center',
          borderRadius: 20,
        }}
      >
        <TextWidget text="VegPrice AI" style={{ color: '#BBC2FF', fontSize: 16, fontWeight: 'bold' }} />
        <TextWidget text="Chennai Market Intelligence" style={{ color: '#666685', fontSize: 11 }} />
      </FlexWidget>
    );
  }

  const rising  = data.all_predictions?.filter((p: any) => p.trend === 'up').length  ?? 0;
  const falling = data.all_predictions?.filter((p: any) => p.trend === 'down').length ?? 0;
  const stable  = (data.total_vegetables ?? 0) - rising - falling;
  const topRising  = (data.top_rising  ?? []).slice(0, 3);
  const topFalling = (data.top_falling ?? []).slice(0, 3);

  return (
    <FlexWidget
      style={{
        width: 'match_parent', height: 'match_parent',
        backgroundColor: '#1B1B26', flexDirection: 'column',
        padding: 14, borderRadius: 20,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="VegPrice AI" style={{ color: '#BBC2FF', fontSize: 14, fontWeight: 'bold' }} />
        <TextWidget text="Chennai Market" style={{ color: '#666685', fontSize: 10 }} />
      </FlexWidget>

      {/* Stats row */}
      <FlexWidget style={{ flexDirection: 'row', marginTop: 10, marginBottom: 2 }}>
        <StatBox label="Tracked"  value={`${data.total_vegetables ?? 0}`} color="#BBC2FF" />
        <FlexWidget style={{ width: 6 }} />
        <StatBox label="Rising"   value={`↑${rising}`}  color="#FFB4AB" />
        <FlexWidget style={{ width: 6 }} />
        <StatBox label="Falling"  value={`↓${falling}`} color="#A8F0C6" />
        <FlexWidget style={{ width: 6 }} />
        <StatBox label="Stable"   value={`→${stable}`}  color="#F5C842" />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget style={{ height: 1, backgroundColor: '#45455C', marginVertical: 8 }} />

      {/* Two-column list */}
      <FlexWidget style={{ flexDirection: 'row', flex: 1 }}>
        {/* Rising column */}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text="↑ Rising" style={{ color: '#FFB4AB', fontSize: 10, fontWeight: 'bold' }} />
          {topRising.map((v: any) => <PriceRow key={v.vegetable} veg={v} showArrow />)}
        </FlexWidget>

        <FlexWidget style={{ width: 1, backgroundColor: '#45455C', marginHorizontal: 10 }} />

        {/* Falling column */}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget text="↓ Falling" style={{ color: '#A8F0C6', fontSize: 10, fontWeight: 'bold' }} />
          {topFalling.map((v: any) => <PriceRow key={v.vegetable} veg={v} showArrow />)}
        </FlexWidget>
      </FlexWidget>

      {/* Footer */}
      <FlexWidget style={{ height: 1, backgroundColor: '#45455C', marginTop: 8, marginBottom: 6 }} />
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget text={`Updated: ${data.last_updated ?? 'today'}`} style={{ color: '#45455C', fontSize: 9 }} />
        <TextWidget text="Tap to open →" style={{ color: '#BBC2FF', fontSize: 9 }} />
      </FlexWidget>
    </FlexWidget>
  );
}
