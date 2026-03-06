<template>
  <div class="dashboard">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <span class="logo">🌍 CityEnv</span>
        <span class="subtitle">Real-time Environment Monitor</span>
      </div>
      <div class="header-right">
        <input v-model="cityInput" @keyup.enter="searchCity" placeholder="Search city..." class="search-input" />
        <button @click="searchCity" class="search-btn">Search</button>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="main">
      <!-- 左侧数据区 -->
      <section class="data-section">
        <!-- 城市名 + 当前状态 -->
        <div class="city-header">
          <h2>{{ currentCity.name }}, {{ currentCity.country }}</h2>
          <span class="aqi-badge" :class="aqiLevel.class">
            AQI {{ aqiData.aqi }} · {{ aqiLevel.label }}
          </span>
          <span v-if="loading" class="loading">Loading...</span>
          <span v-if="error" class="error">{{ error }}</span>
        </div>

        <!-- 数据卡片 -->
        <div class="cards">
          <div class="card">
            <span class="card-icon">🌡️</span>
            <span class="card-label">Temperature</span>
            <span class="card-value">{{ weatherData.temperature }}°C</span>
          </div>
          <div class="card">
            <span class="card-icon">💧</span>
            <span class="card-label">Humidity</span>
            <span class="card-value">{{ weatherData.humidity }}%</span>
          </div>
          <div class="card">
            <span class="card-icon">💨</span>
            <span class="card-label">Wind Speed</span>
            <span class="card-value">{{ weatherData.windspeed }} km/h</span>
          </div>
          <div class="card">
            <span class="card-icon">🫁</span>
            <span class="card-label">PM2.5</span>
            <span class="card-value">{{ aqiData.pm25 }} µg/m³</span>
          </div>
        </div>

        <!-- 7天趋势图 -->
        <!-- 图表占位 -->
        <div class="chart-placeholder">
          <div class="chart-container">
            <div class="chart-title">📈 7-Day Temperature Trend</div>
            <v-chart :option="chartOption" style="height: 280px;" autoresize />
          </div>
        </div>
      </section>

      <!-- 右侧AI助手 -->
      <section class="ai-section">
        <div class="ai-header">🤖 AI Travel Assistant</div>
        <div class="ai-messages" ref="messagesRef">
          <div v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]">
            {{ msg.content }}
          </div>
        </div>
        <div class="ai-input-area">
          <input v-model="userInput" @keyup.enter="sendMessage" placeholder="Ask me anything..." class="ai-input"
            :disabled="aiLoading" />
          <button @click="sendMessage" class="ai-send-btn" :disabled="aiLoading">
            {{ aiLoading ? '...' : 'Send' }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { geocodeCity, fetchEnvironmentData } from '../api/weather'
import type { WeatherData, AirData, CityInfo } from '../types/index'
import { sendMessageToAI } from '../api/ai'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
const cityInput = ref('')
const currentCity = ref<CityInfo>({ name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074 })
const loading = ref(false)
const error = ref('')

const weatherData = ref<WeatherData>({
  temperature: 0,
  humidity: 0,
  windspeed: 0,
  daily: { dates: [], maxTemps: [], minTemps: [] }
})

const aqiData = ref<AirData>({
  aqi: 0,
  pm25: 0,
  pm10: 0
})

// AI 相关
const userInput = ref('')
const aiLoading = ref(false)
const messagesRef = ref<HTMLElement>()
const messages = ref([
  {
    role: 'assistant',
    content: 'Hi! I can help you with travel suggestions based on current air quality and weather. Try asking me something!'
  }
])

const aqiLevel = computed(() => {
  const aqi = aqiData.value.aqi
  if (aqi <= 50) return { label: 'Good', class: 'good' }
  if (aqi <= 100) return { label: 'Moderate', class: 'moderate' }
  if (aqi <= 150) return { label: 'Unhealthy', class: 'unhealthy' }
  return { label: 'Hazardous', class: 'hazardous' }
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    textStyle: { color: '#e0e0e0' }
  },
  legend: {
    data: ['Max Temp', 'Min Temp'],
    textStyle: { color: '#9ca3af' }
  },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: weatherData.value.daily.dates.map(d => d.slice(5)),
    axisLine: { lineStyle: { color: '#374151' } },
    axisLabel: { color: '#9ca3af' }
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: '#374151' } },
    axisLabel: { color: '#9ca3af', formatter: '{value}°C' },
    splitLine: { lineStyle: { color: '#1f2937' } }
  },
  series: [
    {
      name: 'Max Temp',
      type: 'line',
      data: weatherData.value.daily.maxTemps,
      smooth: true,
      lineStyle: { color: '#f97316' },
      itemStyle: { color: '#f97316' },
      areaStyle: { color: 'rgba(249,115,22,0.1)' }
    },
    {
      name: 'Min Temp',
      type: 'line',
      data: weatherData.value.daily.minTemps,
      smooth: true,
      lineStyle: { color: '#3b82f6' },
      itemStyle: { color: '#3b82f6' },
      areaStyle: { color: 'rgba(59,130,246,0.1)' }
    }
  ]
}))

const loadData = async (lat: number, lon: number) => {
  loading.value = true
  error.value = ''
  try {
    const { weather, air } = await fetchEnvironmentData(lat, lon)
    weatherData.value = {
      temperature: weather.current.temperature_2m,
      humidity: weather.current.relative_humidity_2m,
      windspeed: weather.current.wind_speed_10m,
      daily: {
        dates: weather.daily.time,
        maxTemps: weather.daily.temperature_2m_max,
        minTemps: weather.daily.temperature_2m_min
      }
    }
    aqiData.value = {
      aqi: air.current.european_aqi,
      pm25: air.current.pm2_5,
      pm10: air.current.pm10
    }
  } catch (e) {
    error.value = 'Failed to load data'
  } finally {
    loading.value = false
  }
}

const searchCity = async () => {
  if (!cityInput.value.trim()) return
  try {
    const city = await geocodeCity(cityInput.value.trim())
    currentCity.value = city
    cityInput.value = ''
    await loadData(city.lat, city.lon)
  } catch (e) {
    error.value = 'City not found'
  }
}

const sendMessage = async () => {
  if (!userInput.value.trim() || aiLoading.value) return

  const question = userInput.value.trim()
  userInput.value = ''
  messages.value.push({ role: 'user', content: question })
  aiLoading.value = true

  // 先加一个空的assistant消息，流式填充
  messages.value.push({ role: 'assistant', content: '' })
  const lastIndex = messages.value.length - 1

  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }

  try {
    const weatherInfo = `Temperature: ${weatherData.value.temperature}°C, 
      Humidity: ${weatherData.value.humidity}%, 
      Wind: ${weatherData.value.windspeed}km/h, 
      PM2.5: ${aqiData.value.pm25}µg/m³, 
      AQI: ${aqiData.value.aqi}`

    // 不包含最后那条空的assistant消息
    const chatHistory = messages.value.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))

    await sendMessageToAI(
      chatHistory,
      currentCity.value.name,
      weatherInfo,
      (chunk) => {
        messages.value[lastIndex].content += chunk
        nextTick(() => {
          if (messagesRef.value) {
            messagesRef.value.scrollTop = messagesRef.value.scrollHeight
          }
        })
      }
    )
  } catch (e) {
    messages.value[lastIndex].content = 'Error: Could not connect to AI. Make sure Ollama is running.'
  } finally {
    aiLoading.value = false
  }
}

// 进页面就加载北京数据
loadData(currentCity.value.lat, currentCity.value.lon)
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0f1e;
  color: #e0e0e0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: #111827;
  border-bottom: 1px solid #1f2937;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  margin-right: 12px;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
}

.search-input {
  background: #1f2937;
  border: 1px solid #374151;
  color: #e0e0e0;
  padding: 8px 16px;
  border-radius: 8px 0 0 8px;
  outline: none;
  width: 220px;
}

.search-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.data-section {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.city-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.city-header h2 {
  font-size: 28px;
  font-weight: bold;
}

.aqi-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.good {
  background: #065f46;
  color: #6ee7b7;
}

.moderate {
  background: #78350f;
  color: #fcd34d;
}

.unhealthy {
  background: #7f1d1d;
  color: #fca5a5;
}

.hazardous {
  background: #4c1d95;
  color: #c4b5fd;
}

.loading {
  font-size: 13px;
  color: #6b7280;
}

.error {
  font-size: 13px;
  color: #f87171;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-icon {
  font-size: 24px;
}

.card-label {
  font-size: 12px;
  color: #6b7280;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #3b82f6;
}

.chart-placeholder {
  background: #111827;
  border: 1px dashed #374151;
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  color: #4b5563;
}

.ai-section {
  width: 360px;
  background: #111827;
  border-left: 1px solid #1f2937;
  display: flex;
  flex-direction: column;
}

.ai-header {
  padding: 16px 24px;
  font-weight: 600;
  border-bottom: 1px solid #1f2937;
}

.ai-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 12px;
}

.message {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  max-width: 90%;
}

.message.assistant {
  background: #1f2937;
  color: #d1d5db;
  align-self: flex-start;
}

.message.user {
  background: #1d4ed8;
  color: white;
  align-self: flex-end;
}

.ai-input-area {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-top: 1px solid #1f2937;
}

.ai-input {
  flex: 1;
  background: #1f2937;
  border: 1px solid #374151;
  color: #e0e0e0;
  padding: 10px 14px;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
}

.ai-send-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.ai-send-btn:disabled {
  background: #374151;
  cursor: not-allowed;
}

.chart-container {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 20px;
}

.chart-title {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 12px;
}
</style>