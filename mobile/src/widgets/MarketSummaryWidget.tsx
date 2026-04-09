import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface Props {
  data: any;
}

function VegRow({ veg }: { veg: any }) {
  const name       = veg.vegetable.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const trendColor = veg.trend === 'up' ? '#FFB4AB' : veg.trend === 'down' ? '#A8F0C6' : '#F5C842';
  const arrow      = veg.trend === 'up' ? '↑' : veg.trend === 'down' ? '↓' : '→';

  return (
    <FlexWidget
      style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingVertical: 3,
      }}
    >
      <TextWidget text={name} style={{ color: '#B4B4CC', fontSize: 11, fontWeight: 'bold' }} />
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text={arrow} style={{ color: trendColor, fontSize: 11, fontWeight: 'bold' }} />
        <TextWidget
          text={` ₹${veg.predicted_price.toFixed(0)}`}
          style={{ color: trendColor, fontSize: 13, fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// Medium 4×2 widget — shows top 4 vegetables
export function MarketSummaryWidget({ data }: Props) {
  const preds = data?.all_predictions?.slice(0, 6) ?? [];

  if (!preds.length) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent', height: 'match_parent',
          backgroundColor: '#1B1B26', justifyContent: 'center', alignItems: 'center',
          borderRadius: 20,
        }}
      >
        <TextWidget text="Chennai Market" style={{ color: '#BBC2FF', fontSize: 13, fontWeight: 'bold' }} />
        <TextWidget text="Loading prices…" style={{ color: '#666685', fontSize: 11 }} />
      </FlexWidget>
    );
  }

  const rising  = preds.filter((p: any) => p.trend === 'up').length;
  const falling = preds.filter((p: any) => p.trend === 'down').length;
  const col1    = preds.slice(0, 3);
  const col2    = preds.slice(3, 6);

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
        <TextWidget text="Chennai Market" style={{ color: '#BBC2FF', fontSize: 12, fontWeight: 'bold' }} />
        <FlexWidget style={{ flexDirection: 'row' }}>
          <TextWidget text={`↑${rising} `} style={{ color: '#FFB4AB', fontSize: 10, fontWeight: 'bold' }} />
          <TextWidget text={`↓${falling}`} style={{ color: '#A8F0C6', fontSize: 10, fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {/* Two columns */}
      <FlexWidget style={{ flexDirection: 'row', flex: 1, marginTop: 6 }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          {col1.map((v: any) => <VegRow key={v.vegetable} veg={v} />)}
        </FlexWidget>
        <FlexWidget style={{ width: 1, backgroundColor: '#45455C', marginHorizontal: 10 }} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          {col2.map((v: any) => <VegRow key={v.vegetable} veg={v} />)}
        </FlexWidget>
      </FlexWidget>

      {/* Footer */}
      <TextWidget
        text={`${data?.last_updated ?? 'Today'} · Tomorrow's forecast`}
        style={{ color: '#45455C', fontSize: 9 }}
      />
    </FlexWidget>
  );
}
