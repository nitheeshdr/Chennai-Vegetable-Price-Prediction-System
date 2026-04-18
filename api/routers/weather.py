from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from api.schemas.responses import WeatherResponse

router = APIRouter(prefix="/weather", tags=["weather"])

# Chennai coordinates
_LAT = 13.0827
_LON = 80.2707

_WMO_CONDITIONS: dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Icy Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Slight Showers",
    81: "Moderate Showers",
    82: "Heavy Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Thunderstorm with Heavy Hail",
}


def _weather_impact(temp: float, humidity: int, precip: float) -> str:
    if precip > 5:
        return "Heavy rainfall may disrupt supply chains, expect price spikes for perishables"
    if precip > 0:
        return "Rainfall may reduce market arrivals and push prices slightly higher"
    if humidity > 80:
        return "High humidity accelerates spoilage; perishable prices may rise"
    if temp > 38:
        return "Extreme heat increases spoilage risk; prices for leafy vegetables may rise"
    return "Weather conditions are favourable; no significant price impact expected"


@router.get(
    "",
    response_model=WeatherResponse,
    summary="Get current Chennai weather",
    description=(
        "Returns live weather data for Chennai sourced from **Open-Meteo** (no API key required). "
        "Also includes a plain-language estimate of how current weather conditions may affect "
        "vegetable prices (e.g. rainfall disrupting supply, heat increasing spoilage)."
    ),
    response_description="Current weather conditions and price-impact commentary",
)
async def current_weather():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={_LAT}&longitude={_LON}"
        "&current=temperature_2m,relative_humidity_2m,precipitation,"
        "weather_code,wind_speed_10m"
        "&timezone=Asia%2FKolkata"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()["current"]
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {exc}")

    temp = data["temperature_2m"]
    humidity = int(data["relative_humidity_2m"])
    precip = data["precipitation"]
    wind = data["wind_speed_10m"]
    code = int(data["weather_code"])

    return WeatherResponse(
        city="Chennai",
        temperature_c=temp,
        humidity_pct=humidity,
        wind_speed_kmh=wind,
        precipitation_mm=precip,
        condition=_WMO_CONDITIONS.get(code, "Unknown"),
        weather_impact=_weather_impact(temp, humidity, precip),
    )
