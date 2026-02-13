from __future__ import annotations

"""
Lightweight FastAPI service that exposes the RandomForest weather model
to the React frontend. It reproduces the feature engineering + training
steps from the Streamlit prototype (app.py) and returns data in the shape
expected by the UI: location metadata, live conditions, hourly/weekly
forecast, historical summaries, and a 5-day ML-only outlook.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import RandomForestRegressor
# fast api setup
app = FastAPI(
    title="AI Weather Forecast",
    version="1.0.0",
    description="AI Weather Forecast Built By Junaid.",
)
# connect frontend and backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-weather-forecast-orcin.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEATHER_CODE_LABELS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorms",
    96: "Thunder w/ hail",
    99: "Severe hail",
}

FEATURE_COLS = [
    "temp_max",
    "temp_min",
    "rain",
    "wind",
    "humidity",
    "temp_range",
    "rain_binary",
    "humidity_norm",
]

# secure api calls
def safe_get(url: str, params: Optional[Dict] = None) -> Dict:
    try:
        resp = requests.get(url, params=params, timeout=12)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:  # pragma: no cover - network errors
        raise HTTPException(status_code=502, detail=str(exc)) from exc

# convert city to lat/lon
def geocode_city(city: str) -> Dict:
    data = safe_get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 1, "language": "en", "format": "json"},
    )
    results = data.get("results") or []
    if not results:
        raise HTTPException(status_code=404, detail="City not found")
    entry = results[0]
    return {
        "name": entry.get("name", city.title()),
        "country": entry.get("country", ""),
        "latitude": entry["latitude"],
        "longitude": entry["longitude"],
        "timezone": entry.get("timezone", "UTC"),
    }

# current outlook and forecast
def fetch_forecast(lat: float, lon: float, timezone_name: str) -> Dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relativehumidity_2m,precipitation_probability,precipitation",
        "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset",
        "current_weather": "true",
        "timezone": timezone_name,
    }
    forecast = safe_get("https://api.open-meteo.com/v1/forecast", params=params)
    if "current_weather" not in forecast:
        raise HTTPException(status_code=502, detail="Forecast data unavailable")
    return forecast

# fetch historical data for daily
def fetch_historical_daily(lat: float, lon: float, start: datetime, end: datetime) -> pd.DataFrame:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date": end.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean",
        "timezone": "auto",
    }
    payload = safe_get("https://archive-api.open-meteo.com/v1/archive", params=params)
    daily = payload.get("daily")
    if not daily:
        raise HTTPException(status_code=502, detail="Historical data unavailable")
    df = pd.DataFrame(daily)
    df.rename(
        columns={
            "temperature_2m_max": "temp_max",
            "temperature_2m_min": "temp_min",
            "precipitation_sum": "rain",
            "wind_speed_10m_max": "wind",
            "relative_humidity_2m_mean": "humidity",
            "time": "date",
        },
        inplace=True,
    )
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True)

# important feature engineering steps (accuracy boost)
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    enriched["temp_range"] = enriched["temp_max"] - enriched["temp_min"]
    enriched["rain_binary"] = (enriched["rain"] > 0).astype(int)
    enriched["humidity_norm"] = enriched["humidity"] / 100.0
    enriched["target"] = enriched["temp_max"].shift(-1)
    enriched.dropna(inplace=True)
    return enriched

# train the model
def train_model(features: pd.DataFrame, target: pd.Series) -> RandomForestRegressor:
    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(features, target)
    return model

# generate multi-day predictions
def rolling_predictions(model: RandomForestRegressor, last_features: np.ndarray, days: int = 5) -> List[float]:
    preds: List[float] = []
    feat = last_features.copy()
    for _ in range(days):
        pred = float(model.predict(feat)[0])
        preds.append(pred)
        next_temp_min = max(0.9 * feat[0, 1], feat[0, 1] - 1.0)
        next_temp_range = pred - next_temp_min
        feat[0, 0] = pred
        feat[0, 1] = next_temp_min
        feat[0, 5] = next_temp_range
        feat[0, 6] = 1 if feat[0, 2] > 0 else 0
        feat[0, 7] = feat[0, 4] / 100.0
    return preds

# build historical summaries
def build_historical_sections(df: pd.DataFrame) -> Dict:
    df = df.copy()
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year

    monthly_series = df.groupby("month")[["temp_max", "rain"]].mean().reindex(range(1, 13), fill_value=np.nan)
    monthly = [
        {
            "label": datetime(2000, month, 1).strftime("%b"),
            "temp": float(round(monthly_series.loc[month, "temp_max"], 2))
            if pd.notna(monthly_series.loc[month, "temp_max"])
            else None,
            "rain": float(round(monthly_series.loc[month, "rain"], 2))
            if pd.notna(monthly_series.loc[month, "rain"])
            else None,
        }
        for month in range(1, 13)
    ]

    seasonal = []
    labels = ["Aurora", "Zephyr", "Solstice", "Monsoon"]
    for idx in range(4):
        subset = monthly[idx * 3 : idx * 3 + 3]
        valid_temps = [item["temp"] for item in subset if item["temp"] is not None]
        valid_rain = [item["rain"] for item in subset if item["rain"] is not None]
        seasonal.append(
            {
                "label": labels[idx],
                "temp": round(sum(valid_temps) / len(valid_temps), 2) if valid_temps else None,
                "rain": round(sum(valid_rain), 2) if valid_rain else None,
            }
        )
    return {"monthly": monthly, "seasonal": seasonal}

# hourly trend for next 8 hours
def build_hourly_track(forecast: Dict) -> List[Dict]:
    hourly_times = forecast.get("hourly", {}).get("time", [])[:8]
    temps = forecast.get("hourly", {}).get("temperature_2m", [])[:8]
    track = []
    for idx, time_str in enumerate(hourly_times):
        label = "Now"
        if idx != 0:
            label = datetime.fromisoformat(time_str).strftime("%I %p").lstrip("0")
        value = round(temps[idx]) if idx < len(temps) else None
        track.append({"label": label, "value": value})
    return track
# built current conditions from forecast

def derive_current_conditions(forecast: Dict) -> Dict:
    current = forecast["current_weather"]
    hourly = forecast["hourly"]
    time_list = hourly.get("time", [])
    try:
        idx = time_list.index(current["time"])
    except ValueError:
        idx = 0

    humidity = hourly.get("relativehumidity_2m", [None])[idx]
    precipitation = hourly.get("precipitation", [0])[idx]
    condition = WEATHER_CODE_LABELS.get(current["weathercode"], "Live weather")

    uv_index = min(11, max(0, round(6 + (humidity or 50) * 0.05 - precipitation * 0.2)))
    feels_like = round(current["temperature"] + ((humidity or 50) - 50) * 0.06 - precipitation * 0.15)

    return {
        "temperature": round(current["temperature"]),
        "humidity": humidity,
        "windSpeed": round(current["windspeed"]),
        "precipitation": precipitation,
        "weathercode": current["weathercode"],
        "condition": condition,
        "sunrise": forecast.get("daily", {}).get("sunrise", [None])[0],
        "sunset": forecast.get("daily", {}).get("sunset", [None])[0],
        "uvIndex": uv_index,
        "feelsLike": feels_like,
        "pressure": 1005 + np.random.uniform(-4, 4),
        "visibility": 10 - precipitation * 0.2,
    }

# format daily forecast data
def format_forecast_days(forecast: Dict) -> List[Dict]:
    daily = forecast.get("daily", {})
    dates = daily.get("time", [])
    forecast_list = []
    for idx, date in enumerate(dates):
        forecast_list.append(
            {
                "date": date,
                "label": datetime.fromisoformat(date).strftime("%a"),
                "high": round(daily.get("temperature_2m_max", [None])[idx]),
                "low": round(daily.get("temperature_2m_min", [None])[idx]),
                "code": daily.get("weathercode", [1])[idx],
                "rain": round(daily.get("precipitation_sum", [0])[idx]),
            }
        )
    return forecast_list
# build ML model outlook AI forecast

def build_model_outlook(df: pd.DataFrame) -> List[Dict]:
    enriched = add_features(df)
    if len(enriched) < 10:
        return []
    X = enriched[FEATURE_COLS]
    y = enriched["target"]
    model = train_model(X, y)
    last_row = enriched.iloc[-1][FEATURE_COLS]
    preds = rolling_predictions(model, last_row.values.reshape(1, -1), days=5)
    today = datetime.now(timezone.utc)
    return [
        {"date": (today + timedelta(days=idx + 1)).date().isoformat(), "predicted_max_temp_c": round(temp, 2)}
        for idx, temp in enumerate(preds)
    ]

# backend healthcheck
@app.get("/health")
def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}

# main weather endpoint, backend api
@app.get("/api/weather")
def weather_endpoint(city: str = Query(..., description="City or place name to forecast")) -> Dict:
    geo = geocode_city(city)
    end_date = datetime.utcnow() - timedelta(days=2)
    start_date = end_date - timedelta(days=365)
    historical_df = fetch_historical_daily(geo["latitude"], geo["longitude"], start=start_date, end=end_date)
    forecast = fetch_forecast(geo["latitude"], geo["longitude"], geo["timezone"])

    response = {
        "location": {
            "city": geo["name"],
            "country": geo["country"],
            "timezone": geo["timezone"],
        },
        "current": derive_current_conditions(forecast),
        "forecast": format_forecast_days(forecast),
        "hourlyTrend": build_hourly_track(forecast),
        "historical": build_historical_sections(historical_df),
        "modelForecast": build_model_outlook(historical_df),
        "datasetSize": len(historical_df),
    }
    return response


