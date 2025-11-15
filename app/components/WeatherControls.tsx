"use client"

import { useState } from 'react'
import { Cloud, Droplets, Wind, Thermometer, Gauge, RotateCcw, Save } from 'lucide-react'

interface WeatherControlsProps {
  initialWeather?: {
    airTemp?: number
    trackTemp?: number
    humidity?: number
    windSpeed?: number
    windDirection?: number
    pressure?: number
    rain?: boolean
  }
  onWeatherChange?: (weather: any) => void
}

export default function WeatherControls({ initialWeather, onWeatherChange }: WeatherControlsProps) {
  const [weather, setWeather] = useState({
    airTemp: initialWeather?.airTemp || 25,
    trackTemp: initialWeather?.trackTemp || 35,
    humidity: initialWeather?.humidity || 50,
    windSpeed: initialWeather?.windSpeed || 5,
    windDirection: initialWeather?.windDirection || 0,
    pressure: initialWeather?.pressure || 1013,
    rain: initialWeather?.rain || false
  })

  const presets = [
    { name: 'Perfect', airTemp: 22, trackTemp: 30, humidity: 40, windSpeed: 3, rain: false },
    { name: 'Hot', airTemp: 35, trackTemp: 50, humidity: 60, windSpeed: 5, rain: false },
    { name: 'Cold', airTemp: 10, trackTemp: 15, humidity: 70, windSpeed: 8, rain: false },
    { name: 'Wet', airTemp: 18, trackTemp: 20, humidity: 90, windSpeed: 12, rain: true }
  ]

  const applyWeather = () => {
    if (onWeatherChange) {
      onWeatherChange(weather)
    }
  }

  const resetWeather = () => {
    const reset = {
      airTemp: initialWeather?.airTemp || 25,
      trackTemp: initialWeather?.trackTemp || 35,
      humidity: initialWeather?.humidity || 50,
      windSpeed: initialWeather?.windSpeed || 5,
      windDirection: initialWeather?.windDirection || 0,
      pressure: initialWeather?.pressure || 1013,
      rain: initialWeather?.rain || false
    }
    setWeather(reset)
    if (onWeatherChange) {
      onWeatherChange(reset)
    }
  }

  const applyPreset = (preset: any) => {
    const newWeather = {
      ...weather,
      airTemp: preset.airTemp,
      trackTemp: preset.trackTemp,
      humidity: preset.humidity,
      windSpeed: preset.windSpeed,
      rain: preset.rain
    }
    setWeather(newWeather)
    if (onWeatherChange) {
      onWeatherChange(newWeather)
    }
  }

  const updateWeather = (key: string, value: number | boolean) => {
    const newWeather = { ...weather, [key]: value }
    setWeather(newWeather)
  }

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    return directions[Math.round(degrees / 45) % 8]
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Cloud className="w-5 h-5 text-racing-blue" />
          <h3 className="font-semibold text-lg">Weather Controls</h3>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
            Simulation
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetWeather}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center space-x-1 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={applyWeather}
            className="px-3 py-1.5 bg-racing-blue hover:bg-racing-blue/80 rounded text-sm flex items-center space-x-1 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Quick Presets</p>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-2 bg-gray-900/50 hover:bg-gray-700 rounded border border-gray-700 hover:border-racing-blue text-sm transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Weather Controls Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Air Temperature */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold">Air Temperature</span>
            </div>
            <span className="text-lg font-bold text-racing-red">{weather.airTemp}°C</span>
          </div>
          <input
            type="range"
            min="-10"
            max="45"
            value={weather.airTemp}
            onChange={(e) => updateWeather('airTemp', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Air Temperature"
            title="Adjust air temperature"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>-10°C</span>
            <span>45°C</span>
          </div>
        </div>

        {/* Track Temperature */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold">Track Temperature</span>
            </div>
            <span className="text-lg font-bold text-racing-red">{weather.trackTemp}°C</span>
          </div>
          <input
            type="range"
            min="0"
            max="70"
            value={weather.trackTemp}
            onChange={(e) => updateWeather('trackTemp', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Track Temperature"
            title="Adjust track temperature"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0°C</span>
            <span>70°C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Humidity</span>
            </div>
            <span className="text-lg font-bold text-racing-blue">{weather.humidity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weather.humidity}
            onChange={(e) => updateWeather('humidity', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Humidity"
            title="Adjust humidity level"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold">Wind Speed</span>
            </div>
            <span className="text-lg font-bold text-cyan-400">{weather.windSpeed} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={weather.windSpeed}
            onChange={(e) => updateWeather('windSpeed', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Wind Speed"
            title="Adjust wind speed"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 m/s</span>
            <span>30 m/s</span>
          </div>
        </div>

        {/* Wind Direction */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold">Wind Direction</span>
            </div>
            <span className="text-lg font-bold text-green-400">{getWindDirection(weather.windDirection)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={weather.windDirection}
            onChange={(e) => updateWeather('windDirection', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Wind Direction"
            title="Adjust wind direction"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0°</span>
            <span>360°</span>
          </div>
        </div>

        {/* Pressure */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Pressure</span>
            </div>
            <span className="text-lg font-bold text-purple-400">{weather.pressure} hPa</span>
          </div>
          <input
            type="range"
            min="950"
            max="1050"
            value={weather.pressure}
            onChange={(e) => updateWeather('pressure', Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            aria-label="Atmospheric Pressure"
            title="Adjust atmospheric pressure"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>950 hPa</span>
            <span>1050 hPa</span>
          </div>
        </div>
      </div>

      {/* Rain Toggle */}
      <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-semibold">Rain Conditions</p>
              <p className="text-xs text-gray-400">Toggle wet weather simulation</p>
            </div>
          </div>
          <button
            onClick={() => updateWeather('rain', !weather.rain)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              weather.rain ? 'bg-racing-blue' : 'bg-gray-600'
            }`}
            aria-label="Toggle rain conditions"
            title={weather.rain ? 'Disable rain' : 'Enable rain'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                weather.rain ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="mt-4 p-3 bg-gray-900/70 rounded-lg border border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Expected Impact:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Grip Level:</span>
            <span className="ml-2 font-semibold text-racing-blue">
              {weather.rain ? 'Low (-30%)' : weather.trackTemp > 45 ? 'Medium' : 'High'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Tire Wear:</span>
            <span className="ml-2 font-semibold text-racing-red">
              {weather.trackTemp > 45 ? 'High (+25%)' : 'Normal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
