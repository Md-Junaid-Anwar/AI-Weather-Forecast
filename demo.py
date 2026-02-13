import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime, timedelta


st.set_page_config(page_title="AI Weather Forecast", layout="wide")
st.title("🌍 AI Powered Weather Forecast")


# ---------------- Sidebar --------------------
st.sidebar.header("📍 Location Settings")
city_input = st.sidebar.text_input("Enter City Name / Place", value="New Delhi")

st.sidebar.success("📍 Coordinates Found: — , —")   # Dummy coords

st.sidebar.header("📆 Date Range")
st.sidebar.date_input("Start Date", value=datetime(2022,1,1))
st.sidebar.date_input("End Date", value=datetime(2023,1,1))

st.sidebar.header("🗕️ Weather Prediction Filters")
st.sidebar.selectbox("Select Year", [2022, 2023, 2024])
st.sidebar.selectbox("Select Month", list(range(1, 13)))

# ---------------- Tabs -----------------------
tab1, tab2, tab3, tab4 = st.tabs(
    ["📊 Overview", "📈 Trends & Insights", "🔧 Custom Forecast", "💡 Recommendations"]
)

# ---------------- TAB 1 ----------------------
with tab1:
    st.subheader("🌤️ Today's Weather Overview (Demo)")

    col1, col2, col3 = st.columns(3)
    col1.metric("Max Temp (°C)", "—")
    col2.metric("Min Temp (°C)", "—")
    col3.metric("Humidity (%)", "—")

    col4, col5 = st.columns(2)
    col4.metric("Wind Speed (km/h)", "—")
    col5.metric("Rainfall (mm)", "—")

    st.markdown("### ⏩ 5-Day Max Temperature Forecast")
    df_demo = pd.DataFrame({
        "Date": [(datetime.today() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1,6)],
        "Predicted Max Temp (°C)": ["—"]*5
    })
    st.table(df_demo)

    st.markdown("### 📊 Historical Temperature Trends (Demo)")
    fig1 = go.Figure()
    fig1.add_trace(go.Scatter(x=[], y=[], mode='lines', name='Max Temp'))
    fig1.update_layout(template="plotly_dark")
    st.plotly_chart(fig1)

    st.subheader("📊 Model Performance Metrics")
    st.dataframe(pd.DataFrame({
        "Feature": ["Max Temp", "Min Temp", "Rain", "Wind", "Humidity"],
        "Importance": ["—"]*5
    }))

    st.write("### Model R² Score: **—**")

    st.subheader("📅 Download Cleaned Weather Dataset")
    st.download_button(
        "Download CSV",
        data="",
        file_name="weather_data_demo.csv"
    )

# ---------------- TAB 2 ----------------------
with tab2:
    st.subheader("📊 Yearly Average Max/Min Temperature (Demo)")

    df_year = pd.DataFrame({
        "year": [2021, 2022, 2023],
        "temp_max": ["—","—","—"],
        "temp_min": ["—","—","—"]
    })
    st.table(df_year)

    st.subheader("🚨 Anomaly Detection (Demo)")
    fig4 = go.Figure()
    fig4.update_layout(template="plotly_dark")
    st.plotly_chart(fig4)

    st.subheader("🌧️ Monthly Rainfall Trends (Demo)")
    fig5 = go.Figure()
    fig5.update_layout(template="plotly_dark")
    st.plotly_chart(fig5)

# ---------------- TAB 3 ----------------------
with tab3:
    st.subheader("🛠️ Predict Max Temperature (Demo)")

    st.number_input("Max Temperature (°C)", 0, 60, 30)
    st.number_input("Min Temperature (°C)", -10, 40, 20)
    st.number_input("Rainfall (mm)", 0, 500, 5)
    st.slider("Wind Speed (km/h)", 0, 150, 10)
    st.slider("Humidity (%)", 0, 100, 50)

    if st.button("🔮 Predict Temperature"):
        st.success("📈 Predicted Max Temperature: **— °C**")

# ---------------- TAB 4 ----------------------
with tab4:
    st.subheader("Smart Weather-Based Recommendations (Demo)")

    st.info("Weather looks good! (Demo)")
    st.info("Stay hydrated! (Demo)")
    st.info("Carry an umbrella! (Demo)")

st.caption("© 2025 Global Weather AI Forecasting App | Demo Frontend Only")
