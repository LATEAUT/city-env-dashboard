export interface CityInfo {
  name: string
  country: string
  lat: number
  lon: number
}

export interface WeatherData {
  temperature: number
  humidity: number
  windspeed: number
  daily: {
    dates: string[]
    maxTemps: number[]
    minTemps: number[]
  }
}

export interface AirData {
  aqi: number
  pm25: number
  pm10: number
}

export interface AqiLevel {
  label: string
  class: string
}