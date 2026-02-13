# 🌦️ AI Weather Forecast

AI-powered weather forecasting web app that combines real-time weather data with Machine Learning predictions to provide intelligent forecasts and historical insights.

## 🚀 Live Demo
Frontend: https://ai-weather-forecast-orcin.vercel.app  
Backend API: https://ai-weather-forecast-zwyp.onrender.com

---

## ✨ Features
- Real-time weather by city
- AI-based 5-day temperature prediction
- Hourly and weekly forecasts
- Historical weather analysis
- Responsive modern UI
- FastAPI REST API backend

---

## 🧠 Tech Stack
**Frontend**
- React (Vite)
- JavaScript

**Backend**
- FastAPI
- Python
- Uvicorn

**Machine Learning**
- Scikit-learn (Random Forest)
- Pandas & NumPy

**Data Source**
- Open-Meteo API

---

## ⚙️ Run Locally

### Backend
```bash
pip install -r requirements.txt
uvicorn backend_api:app --reload
````

### Frontend

```bash
npm install
npm run dev
```

---

## 📡 API Endpoint

```
GET /api/weather?city=Delhi
```

Returns current weather, forecast data, historical summaries, and AI predictions.

---

## 👨‍💻 Author

**Md Junaid Anwar**

GitHub: [https://github.com/Md-Junaid-Anwar](https://github.com/Md-Junaid-Anwar)
