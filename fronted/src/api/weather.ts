import axios from 'axios'

// 先把城市名转成经纬度
export const geocodeCity = async (city: string) => {
  const res = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: city, count: 1, language: 'en', format: 'json' }
  })
  const result = res.data.results?.[0]
  if (!result) throw new Error('City not found')
  return {
    name: result.name,
    country: result.country,
    lat: result.latitude,
    lon: result.longitude
  }
}

// 拿天气 + 空气质量
export const fetchEnvironmentData = async (lat: number, lon: number) => {
  const [weatherRes, airRes] = await Promise.all([
    axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
        daily: 'temperature_2m_max,temperature_2m_min',
        forecast_days: 7,
        timezone: 'auto'
      }
    }),
    axios.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'pm2_5,pm10,european_aqi',
        timezone: 'auto'
      }
    })
  ])

  return {
    weather: weatherRes.data,
    air: airRes.data
  }
}