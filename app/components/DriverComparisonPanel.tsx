"use client"

import { useMemo, useState } from 'react'
import { Users, ArrowUpRight } from 'lucide-react'

interface DriverComparisonPanelProps {
  raceData: any
}

function formatLapTime(raw: any): string {
  const n = Number(raw)
  if (!isFinite(n) || n <= 0) return 'N/A'
  const minutes = Math.floor(n / 60)
  const seconds = n - minutes * 60
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`
}

export default function DriverComparisonPanel({ raceData }: DriverComparisonPanelProps) {
  const [primaryDriver, setPrimaryDriver] = useState<string>('')
  const [secondaryDriver, setSecondaryDriver] = useState<string>('')

  const drivers = useMemo(() => {
    const names = new Set<string>()

    if (Array.isArray(raceData?.raceResults)) {
      for (const r of raceData.raceResults) {
        const name =
          r.driverName ||
          r.driver ||
          r.Driver ||
          r["Driver Name"] ||
          ''
        if (typeof name === 'string' && name.trim()) {
          names.add(name.trim())
        }
      }
    }

    if (Array.isArray(raceData?.lapTimes)) {
      for (const l of raceData.lapTimes) {
        const name =
          l.driver ||
          l.Driver ||
          l.driverName ||
          l["Driver Name"] ||
          ''
        if (typeof name === 'string' && name.trim()) {
          names.add(name.trim())
        }
      }
    }

    return Array.from(names.values()).sort()
  }, [raceData])

  const laps = useMemo(() => {
    if (!Array.isArray(raceData?.lapTimes)) return []

    const byDriver: Record<string, Map<number, any>> = {}

    for (const l of raceData.lapTimes) {
      const name =
        l.driver ||
        l.Driver ||
        l.driverName ||
        l["Driver Name"]
      if (!name || typeof name !== 'string') continue

      const lapNumber: number =
        Number(
          l.lapNumber ??
          l.lap ??
          l.Lap ??
          l["Lap Number"] ??
          0
        ) || 0
      if (lapNumber <= 0) continue

      if (!byDriver[name]) byDriver[name] = new Map()
      byDriver[name].set(lapNumber, l)
    }

    return { byDriver }
  }, [raceData]) as { byDriver: Record<string, Map<number, any>> } | any

  const comparisonRows = useMemo(() => {
    if (!primaryDriver || !secondaryDriver) return []
    if (!laps?.byDriver) return []

    const a = laps.byDriver[primaryDriver]
    const b = laps.byDriver[secondaryDriver]
    if (!a || !b) return []

    const lapNumbers = new Set<number>()
    for (const key of a.keys()) lapNumbers.add(key)
    for (const key of b.keys()) lapNumbers.add(key)

    const rows: {
      lap: number
      aTime: number | null
      bTime: number | null
      delta: number | null
    }[] = []

    Array.from(lapNumbers.values()).sort((x, y) => x - y).forEach((lap) => {
      const la = a.get(lap)
      const lb = b.get(lap)

      const rawA = la?.lapTime ?? la?.time ?? la?.LapTime ?? la?.Time
      const rawB = lb?.lapTime ?? lb?.time ?? lb?.LapTime ?? lb?.Time

      const aTime = rawA != null ? Number(rawA) : null
      const bTime = rawB != null ? Number(rawB) : null

      let delta: number | null = null
      if (aTime != null && isFinite(aTime) && bTime != null && isFinite(bTime)) {
        delta = aTime - bTime
      }

      if (aTime != null || bTime != null) {
        rows.push({ lap, aTime, bTime, delta })
      }
    })

    return rows
  }, [primaryDriver, secondaryDriver, laps])

  if (!Array.isArray(raceData?.lapTimes) || drivers.length < 2) {
    return null
  }

  const summary = (() => {
    if (!comparisonRows.length) return null
    const deltas = comparisonRows
      .map(r => r.delta)
      .filter((d): d is number => d != null && isFinite(d))
    if (!deltas.length) return null
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
    const best = Math.min(...deltas)
    const worst = Math.max(...deltas)
    return { avg, best, worst }
  })()

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-xl p-6 mb-8 border border-racing-blue/30 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-racing-blue" />
          <h3 className="text-lg font-semibold">Driver Lap Comparison</h3>
        </div>
        <span className="text-xs text-gray-400 flex items-center space-x-1">
          <ArrowUpRight className="w-3 h-3" />
          <span>Per-lap delta (seconds)</span>
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-400">Primary driver</span>
          <select
            value={primaryDriver}
            onChange={e => setPrimaryDriver(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-gray-100"
            title="Select primary driver"
          >
            <option value="">Select driver</option>
            {drivers.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <span className="text-xs text-gray-400">Comparison driver</span>
          <select
            value={secondaryDriver}
            onChange={e => setSecondaryDriver(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs text-gray-100"
            title="Select comparison driver"
          >
            <option value="">Select driver</option>
            {drivers.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-center text-xs text-gray-300 space-y-1">
          {summary ? (
            <>
              <div>
                <span className="text-gray-400">Avg Δ (A - B): </span>
                <span className={summary.avg < 0 ? 'text-green-400' : 'text-red-400'}>
                  {summary.avg.toFixed(3)}s
                </span>
              </div>
              <div>
                <span className="text-gray-400">Best lap Δ: </span>
                <span className={summary.best < 0 ? 'text-green-400' : 'text-red-400'}>
                  {summary.best.toFixed(3)}s
                </span>
              </div>
              <div>
                <span className="text-gray-400">Worst lap Δ: </span>
                <span className={summary.worst < 0 ? 'text-green-400' : 'text-red-400'}>
                  {summary.worst.toFixed(3)}s
                </span>
              </div>
            </>
          ) : (
            <span className="text-gray-500">Select two drivers to compare lap times.</span>
          )}
        </div>
      </div>

      {comparisonRows.length > 0 && (
        <div className="max-h-64 overflow-y-auto border border-gray-800 rounded-lg">
          <table className="min-w-full text-xs text-gray-200">
            <thead className="bg-gray-900/80 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-400">Lap</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-400">{primaryDriver || 'Driver A'}</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-400">{secondaryDriver || 'Driver B'}</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-400">Δ (A - B)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(row => (
                <tr key={row.lap} className="odd:bg-gray-900/40 even:bg-gray-900/20">
                  <td className="px-3 py-1.5">{row.lap}</td>
                  <td className="px-3 py-1.5">{row.aTime != null ? formatLapTime(row.aTime) : '—'}</td>
                  <td className="px-3 py-1.5">{row.bTime != null ? formatLapTime(row.bTime) : '—'}</td>
                  <td className="px-3 py-1.5">
                    {row.delta != null && isFinite(row.delta)
                      ? (
                        <span className={row.delta < 0 ? 'text-green-400' : 'text-red-400'}>
                          {row.delta.toFixed(3)}s
                        </span>
                      )
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
