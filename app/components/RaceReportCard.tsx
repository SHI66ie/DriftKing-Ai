"use client"

import {
  BarChart3,
  Flag,
  FlagCheckered,
  Trophy,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  FileText
} from 'lucide-react'

export interface ReportHighlight {
  label: string
  value: string
  sublabel?: string
}

export interface ReportDocument {
  name: string
  sizeMB: number
  url: string
}

export interface ReportSection {
  title: string
  items: string[]
}

export interface FormattedRaceReport {
  title: string
  track: string
  race: string
  generatedAt: string
  dataSource?: string
  badges: string[]
  summaryHeadline: string
  summaryPoints: string[]
  topFinishers: { position: number; driver: string; team?: string; totalTime?: string }[]
  weather?: { temperature?: string; humidity?: string; wind?: string }
  telemetryStatus?: string
  highlights: ReportHighlight[]
  analysisSections: ReportSection[]
  metadata?: { model?: string; tokensUsed?: number; provider?: string }
  documents?: ReportDocument[]
  rawAnalysis: string
}

interface RaceReportCardProps {
  report: FormattedRaceReport
  onClose: () => void
  onDownload: () => void
}

export default function RaceReportCard({ report, onClose, onDownload }: RaceReportCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-black border border-gray-700 rounded-2xl p-6 text-white shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 flex items-center space-x-2">
            <Flag className="w-4 h-4 text-racing-red" />
            <span>{report.title}</span>
          </p>
          <h3 className="text-2xl font-bold mt-1 flex items-center space-x-2">
            <FlagCheckered className="w-6 h-6 text-racing-red" />
            <span>{report.track}</span>
          </h3>
          <p className="text-gray-400 text-sm">{report.race} • Generated {report.generatedAt}</p>
          {report.dataSource && <p className="text-xs text-gray-500">Data Source: {report.dataSource}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {report.badges.map((badge, idx) => (
            <span key={idx} className="text-xs border border-gray-600 px-3 py-1 rounded-full bg-gray-800/60">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <div className="md:col-span-3 bg-gray-900/70 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-racing-red font-semibold uppercase">Race Headline</p>
          <h4 className="text-xl font-semibold mt-1 mb-2">{report.summaryHeadline}</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {report.summaryPoints.map((point, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-racing-red">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 bg-gray-900/70 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase">Podium</p>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="space-y-2">
            {report.topFinishers.length ? (
              report.topFinishers.map((driver) => (
                <div key={`${driver.driver}-${driver.position}`} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-racing-red font-semibold mr-2">P{driver.position}</span>
                    <span className="font-medium">{driver.driver}</span>
                    {driver.team && <span className="text-xs text-gray-500 ml-1">{driver.team}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{driver.totalTime || '—'}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No official results available.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {report.weather && (
          <div className="bg-gray-900/70 rounded-xl p-4 border border-gray-700 space-y-2">
            <p className="text-xs text-gray-400 uppercase flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span>Weather Snapshot</span>
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-300">
                <p>Air Temp</p>
                <p className="text-lg font-semibold">{report.weather.temperature || '—'}</p>
              </div>
              <div className="text-gray-300">
                <div className="flex items-center space-x-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span>{report.weather.humidity || '—'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-cyan-300" />
                  <span>{report.weather.wind || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {report.telemetryStatus && (
          <div className="bg-gray-900/70 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-green-400" />
              <span>Telemetry</span>
            </p>
            <p className="text-sm text-gray-300">{report.telemetryStatus}</p>
          </div>
        )}

        {report.highlights.length > 0 && (
          <div className="bg-gray-900/70 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 uppercase flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Highlights</span>
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              {report.highlights.map((highlight, idx) => (
                <div key={`${highlight.label}-${idx}`}>
                  <p className="font-semibold text-white">{highlight.value}</p>
                  <p className="text-xs text-gray-400">{highlight.label}</p>
                  {highlight.sublabel && <p className="text-[11px] text-gray-500">{highlight.sublabel}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {report.analysisSections.map((section) => (
          <div key={section.title} className="bg-gray-900/70 rounded-xl p-4 border border-gray-800">
            <h4 className="font-semibold text-lg mb-3 text-white">{section.title}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              {section.items.map((item, idx) => (
                <li key={`${section.title}-${idx}`} className="flex items-start space-x-2">
                  <span className="text-racing-red mt-1">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/70 rounded-xl p-4 border border-gray-700 mb-6">
        <p className="text-xs uppercase text-gray-400 mb-2">Full AI Commentary</p>
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {report.rawAnalysis}
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-xs text-gray-400 space-y-1">
          {report.metadata?.model && <p>Model: {report.metadata.model}</p>}
          {report.metadata?.provider && <p>Provider: {report.metadata.provider}</p>}
          {report.metadata?.tokensUsed && <p>Tokens: {report.metadata.tokensUsed}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {report.documents && report.documents.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <FileText className="w-4 h-4" />
              <span>{report.documents.length} reference PDFs</span>
            </div>
          )}
          <button
            onClick={onDownload}
            className="px-4 py-2 rounded-lg bg-racing-blue hover:bg-racing-blue/80 text-sm font-semibold flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Download Report</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-semibold hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
