import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cloud,
  Droplets,
  Flame,
  MapPin,
  Search,
  Sparkles,
  Sun,
  ThermometerSun,
  Umbrella,
  Wind,
} from 'lucide-react';
import './App.css';

const defaultCity = 'New Delhi';
const API_BASE = "https://ai-weather-forecast-zwyp.onrender.com"

const weatherCodeMap = {
  0: { label: 'Clear sky', tone: 'sunny' },
  1: { label: 'Mainly clear', tone: 'sunny' },
  2: { label: 'Partly cloudy', tone: 'mild' },
  3: { label: 'Cloudy', tone: 'cloudy' },
  45: { label: 'Foggy', tone: 'foggy' },
  48: { label: 'Rime fog', tone: 'foggy' },
  51: { label: 'Light drizzle', tone: 'rainy' },
  53: { label: 'Drizzle', tone: 'rainy' },
  55: { label: 'Heavy drizzle', tone: 'rainy' },
  56: { label: 'Freezing drizzle', tone: 'icy' },
  57: { label: 'Freezing drizzle', tone: 'icy' },
  61: { label: 'Light rain', tone: 'rainy' },
  63: { label: 'Moderate rain', tone: 'rainy' },
  65: { label: 'Heavy rain', tone: 'rainy' },
  66: { label: 'Freezing rain', tone: 'icy' },
  67: { label: 'Freezing rain', tone: 'icy' },
  71: { label: 'Light snow', tone: 'snowy' },
  73: { label: 'Snow', tone: 'snowy' },
  75: { label: 'Heavy snow', tone: 'snowy' },
  77: { label: 'Snow grains', tone: 'snowy' },
  80: { label: 'Rain showers', tone: 'rainy' },
  81: { label: 'Heavy showers', tone: 'rainy' },
  82: { label: 'Violent showers', tone: 'stormy' },
  85: { label: 'Snow showers', tone: 'snowy' },
  86: { label: 'Snow showers', tone: 'snowy' },
  95: { label: 'Thunderstorms', tone: 'stormy' },
  96: { label: 'Thunder w/ hail', tone: 'stormy' },
  99: { label: 'Severe hail', tone: 'stormy' },
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//
const fallbackWeather = {
  location: { city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' },
  current: {
    temperature: 32,
    humidity: 58,
    windSpeed: 9,
    precipitation: 0.2,
    weathercode: 1,
    condition: 'Mainly clear',
    sunrise: '2025-11-20T06:41',
    sunset: '2025-11-20T17:24',
    uvIndex: 8,
    feelsLike: 34,
    pressure: 1006,
    visibility: 9,
  },
  forecast: [
    { label: 'Thu', date: '2025-11-20', high: 33, low: 24, code: 1, rain: 0.2 },
    { label: 'Fri', date: '2025-11-21', high: 32, low: 23, code: 2, rain: 0.6 },
    { label: 'Sat', date: '2025-11-22', high: 31, low: 22, code: 3, rain: 0.8 },
    { label: 'Sun', date: '2025-11-23', high: 30, low: 21, code: 61, rain: 1.4 },
    { label: 'Mon', date: '2025-11-24', high: 29, low: 21, code: 63, rain: 2.1 },
    { label: 'Tue', date: '2025-11-25', high: 28, low: 20, code: 2, rain: 0.4 },
    { label: 'Wed', date: '2025-11-26', high: 29, low: 19, code: 1, rain: 0 },
  ],
  hourlyTrend: [
    { label: '10 AM', value: 31 },
    { label: '12 PM', value: 32 },
    { label: '2 PM', value: 33 },
    { label: '4 PM', value: 32 },
    { label: '6 PM', value: 30 },
    { label: '8 PM', value: 28 },
    { label: '10 PM', value: 26 },
  ],
  historical: {
    monthly: months.map((m, idx) => ({
      label: m,
      temp: 18 + Math.sin((idx / 12) * Math.PI * 2) * 10,
      rain: 90 - Math.cos((idx / 12) * Math.PI * 2) * 40,
    })),
    seasonal: [
      { label: 'Cool', temp: 18, rain: 62 },
      { label: 'Warm', temp: 31, rain: 45 },
      { label: 'Humid', temp: 34, rain: 110 },
      { label: 'Monsoon', temp: 27, rain: 220 },
    ],
  },
};

function GlassCard({ children, className = '' }) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}

function TemperatureChart({ data }) {
  if (!data?.length) {
    return <div className="text-slate-400 text-sm">No forecast available</div>;
  }

  const highs = data.map((day) => day.high);
  const maxTemp = Math.max(...highs);
  const minTemp = Math.min(...highs);
  const range = maxTemp - minTemp || 1;

  const points = data
    .map((day, idx) => {
      const x = (idx / (data.length - 1 || 1)) * 100;
      const y = ((maxTemp - day.high) / range) * 70 + 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (

<svg viewBox="0 0 100 100" className="forecast-chart">
  <defs>
    <linearGradient id="tempGradient" x1="0%" x2="100%" y1="0%" y2="0%">
      <stop offset="0%" stopColor="#f97316" />
      <stop offset="50%" stopColor="#22d3ee" />
      <stop offset="100%" stopColor="#38bdf8" />
    </linearGradient>
  </defs>

  <polyline
    fill="none"
    stroke="url(#tempGradient)"
    strokeWidth="4"
    strokeLinecap="round"
    points={points}
  />

  {data.map((day, idx) => {
    const x = (idx / (data.length - 1 || 1)) * 100;
    const y = ((maxTemp - day.high) / range) * 70 + 15;
    return <circle key={day.date} cx={x} cy={y} r="2" fill="#f8fafc" opacity="0.9" />;
  })}

  {/* ▼ Add this block here ▼ */}
  <text x="2" y="15" fontSize="5" fill="#94a3b8">{maxTemp}°</text>
  <text x="103" y="85" fontSize="5" fill="#94a3b8">{minTemp}°</text>
  {/* <line x1="8" y1="10" x2="8" y2="90" stroke="#334155" strokeWidth="0.5" />
  <line x1="8" y1="90" x2="100" y2="90" stroke="#334155" strokeWidth="0.5" /> */}

  {data.map((day, idx) => {
    const x = (idx / (data.length - 1 || 1)) * 100;
    return (
      <text
        key={day.date + '-label'}
        x={x}
        y={97}
        fontSize=""
        textAnchor="middle"
        fill="#94a3b8"
      >
        {/* {day.label} */}
      </text>
    );
  })}
</svg>

  );
}

function HistoricalChart({ data, gradientId }) {
  if (!data?.length) return null;

  const temps = data.map((d) => d.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const range = maxTemp - minTemp || 1;

  const areaPath = data
    .map((point, idx) => {
      const x = (idx / (data.length - 1 || 1)) * 100;
      const y = ((maxTemp - point.temp) / range) * 70 + 10;
      return `${idx === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="historical-chart">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(14,165,233,0.55)" />
          <stop offset="80%" stopColor="rgba(59,130,246,0.05)" />
        </linearGradient>
      </defs>
      <path d={`${areaPath} L100,90 L0,90 Z`} fill={`url(#${gradientId})`} opacity="0.85" />
      <path d={areaPath} stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function formatTime(dateString, options = {}) {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...options });
}

function App() {
  const [query, setQuery] = useState(defaultCity);
  const [weatherData, setWeatherData] = useState(null);
  const [historicalView, setHistoricalView] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [predictor, setPredictor] = useState({ humidity: 60, wind: 8, cloud: 25 });

  const activeWeather = weatherData ?? fallbackWeather;

  useEffect(() => {
    fetchWeather(defaultCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
// fetch weather function
  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/weather?city=${encodeURIComponent(cityName)}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Backend weather service unavailable.');
      }
      
      const data = await response.json();
      setWeatherData(data);
      setIsLive(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to fetch weather now. Showing intelligence preview.');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  const heroTone = weatherCodeMap[activeWeather.current.weathercode]?.tone ?? 'sunny';
// smart recommendations
  const recommendations = useMemo(() => {
    const humidity = activeWeather.current.humidity ?? 50;
    const rain = activeWeather.current.precipitation ?? 0;
    const wind = activeWeather.current.windSpeed;
    const tips = [];

    if (rain > 1) tips.push({ label: 'Carry an umbrella', detail: 'Rain probability elevated through the afternoon.' });
    if (humidity > 70)
      tips.push({ label: 'Hydrate often', detail: 'Warm and humid air may feel heavier during commutes.' });
    if (wind > 20)
      tips.push({ label: 'Secure outdoor items', detail: 'Wind gusts can reach advisory levels later today.' });
    if (tips.length === 0) {
      tips.push({ label: 'Great day outside', detail: 'Conditions are optimal for walks and light workouts.' });
    }
    return tips.slice(0, 3);
  }, [activeWeather]);
// custom predictor logic
  const predictedTemp = useMemo(() => {
    const base = activeWeather.current.temperature ?? 28;
    const humidityAdj = (predictor.humidity - 60) * 0.05;
    const windAdj = predictor.wind * 0.12;
    const cloudAdj = (predictor.cloud - 25) * -0.08;
    return Math.round(base + humidityAdj - cloudAdj - windAdj);
  }, [predictor, activeWeather]);

  const handlePredictorChange = (field) => (event) => {
    setPredictor((prev) => ({ ...prev, [field]: Number(event.target.value) }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    fetchWeather(query.trim());
  };

  const forecastData = activeWeather.forecast ?? [];
  const hourlyData = activeWeather.hourlyTrend ?? [];
  const historicalData = activeWeather.historical?.[historicalView] ?? [];
  const highestRain = forecastData.length ? Math.max(...forecastData.map((d) => d.rain ?? 0)) : 0;

  return (
    <div className="app-shell">
      <div className="sky-gradient" />
      <div className="blur-sphere sphere-one" />
      <div className="blur-sphere sphere-two" />
      <main className="dashboard">
        <header className="hero glass-card">
          <div>
            <p className="hero-pill">Weather · AI Assisted</p>
            <div className="hero-heading">
              <h1>AI Weather Forecast</h1>
              <Sparkles className="text-sky-200" size={28} />
            </div>
            <p className="hero-subtitle">
              Live intelligence, predictive insights and beautiful visualizations for every city on Earth.
            </p>
            <div className="hero-meta">
              <span className="meta-item">
                <MapPin size={16} /> {activeWeather.location.city}, {activeWeather.location.country}
              </span>
              <span className="meta-item">{isLive ? 'Live weather' : 'Intelligence preview'}</span>
            </div>
          </div>
          <form className="search" onSubmit={handleSearch}>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
              placeholder="Search any city"
            />
            <button type="submit" className="search-button">
              Explore
            </button>
          </form>
        </header>

        {error && <p className="error-message">{error}</p>}

        <section className="grid grid-main">
          <GlassCard className={`live-panel tone-${heroTone}`}>
            <div className="panel-header">
              <div>
                <p className="panel-label">Current outlook</p>
                <h2>{activeWeather.current.temperature}°C</h2>
                <p className="panel-condition">{activeWeather.current.condition}</p>
              </div>
              <span className="condition-icon">🌤️</span>
            </div>
            <div className="metrics">
              <div>
                <p>Feels like</p>
                <strong>{activeWeather.current.feelsLike ?? '—'}°</strong>
              </div>
              <div>
                <p>Humidity</p>
                <strong>{activeWeather.current.humidity ?? '—'}%</strong>
              </div>
              <div>
                <p>Wind</p>
                <strong>{activeWeather.current.windSpeed ?? '—'} km/h</strong>
              </div>
              <div>
                <p>UV index</p>
                <strong>{activeWeather.current.uvIndex ?? '—'}</strong>
              </div>
            </div>
            <div className="sunrise">
              <div>
                <Sun size={16} />
                <span>Sunrise</span>
                <strong>{formatTime(activeWeather.current.sunrise)}</strong>
              </div>
              <div>
                <Flame size={16} />
                <span>Sunset</span>
                <strong>{formatTime(activeWeather.current.sunset)}</strong>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="forecast-panel">
            <div className="section-head">
              <h3>7-Day Forecast</h3>
              <p>Swipe through the week</p>
            </div>

            
            <TemperatureChart data={forecastData} />



            <div className="forecast-grid">
              {forecastData.map((day) => (
                <div key={day.date} className="forecast-item">
                  <p>{day.label}</p>
                  <strong>
                    {day.high}° / {day.low}°
                  </strong>
                  <span>{weatherCodeMap[day.code]?.label ?? 'Outlook'}</span>
                  <small>{day.rain} mm rain</small>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-trends">
          <GlassCard>
            <div className="section-head">
              <h3>Hourly glide</h3>
            </div>
            <div className="hourly-track">
              {hourlyData.map((point) => (
                <div key={point.label} className="hour-pill">
                  <p>{point.label}</p>
                  <strong>{point.value}°</strong>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="section-head">
              <h3>Smart recommendations</h3>
            </div>
            <div className="recommendations">
              {recommendations.map((tip) => (
                <div key={tip.label} className="tip">
                  <Sparkles size={16} />
                  <div>
                    <strong>{tip.label}</strong>
                    <p>{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-historical">
          <GlassCard>
            <div className="section-head">
              <h3>Historical trends</h3>
              <div className="tabs">
                {['monthly', 'seasonal'].map((view) => (
                  <button
                    key={view}
                    className={historicalView === view ? 'active' : ''}
                    onClick={() => setHistoricalView(view)}
                    type="button"
                  >
                    {view === 'monthly' ? 'Monthly' : 'Seasonal'}
                  </button>
                ))}
              </div>
            </div>
            <HistoricalChart
              data={historicalData}
              gradientId={`hist-${historicalView}`}
            />
            <div className="historical-grid">
              {historicalData.map((val) => (
                <div key={val.label}>
                  <p>{val.label}</p>
                  <strong>{Math.round(val.temp)}°C</strong>
                  <small>{Math.round(val.rain)} mm rain</small>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="section-head">
              <h3>Custom predictor</h3>
              <p>Experiment with humidity, wind & cloud cover</p>
            </div>
            <div className="predictor-controls">
              <label>
                Humidity: {predictor.humidity}%
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={predictor.humidity}
                  onChange={handlePredictorChange('humidity')}
                />
              </label>
              <label>
                Wind: {predictor.wind} km/h
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={predictor.wind}
                  onChange={handlePredictorChange('wind')}
                />
              </label>
              <label>
                Cloud cover: {predictor.cloud}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={predictor.cloud}
                  onChange={handlePredictorChange('cloud')}
                />
              </label>
            </div>
            <div className="predictor-output">
              <ThermometerSun size={48} />
              <div>
                <p>AI-predicted comfort temperature</p>
                <strong>{predictedTemp}°C</strong>
              </div>
            </div>
          </GlassCard>
        </section>

        <section className="grid grid-metrics">
          <GlassCard>
            <div className="mini-head">
              <Droplets size={16} />
              <p>Precipitation intelligence</p>
            </div>
            <strong className="metric-value">{activeWeather.current.precipitation ?? 0} mm</strong>
            <p className="metric-detail">Current rain estimation in the city core.</p>
          </GlassCard>
          <GlassCard>
            <div className="mini-head">
              <Wind size={16} />
              <p>Wind monitoring</p>
            </div>
            <strong className="metric-value">{activeWeather.current.windSpeed ?? 0} km/h</strong>
            <p className="metric-detail">Adaptive gust monitor with coastal awareness.</p>
          </GlassCard>
          <GlassCard>
            <div className="mini-head">
              <Umbrella size={16} />
              <p>Rain probability</p>
            </div>
            <strong className="metric-value">{highestRain > 0 ? 'High' : 'Low'}</strong>
            <p className="metric-detail">5-day precipitation outlook.</p>
          </GlassCard>
          <GlassCard>
            <div className="mini-head">
              <Activity size={16} />
              <p>Air clarity</p>
            </div>
            <strong className="metric-value">
              {(activeWeather.current.visibility ?? 10).toFixed(1)} km
            </strong>
            <p className="metric-detail">Visibility and clarity for aviation-ready insights.</p>
          </GlassCard>
          <GlassCard>
            <div className="mini-head">
              <Cloud size={16} />
              <p>Pressure</p>
            </div>
            <strong className="metric-value">
              {(activeWeather.current.pressure ?? 1005).toFixed(0)} hPa
            </strong>
            <p className="metric-detail">Monitoring synoptic pressure anomalies.</p>
          </GlassCard>
          <GlassCard>
            <div className="mini-head">
              <Sun size={16} />
              <p>UV safety</p>
            </div>
            <strong className="metric-value">{activeWeather.current.uvIndex ?? 7}</strong>
            <p className="metric-detail">Protective guidance from sunrise to golden hour.</p>
          </GlassCard>
        </section>
      </main>

      {loading && (
        <div className="loading">
          <span className="loader" />
          <p>Fetching atmospheric intelligence...</p>
        </div>
      )}
    </div>
  );
}

export default App;
