"use client"

import { useState } from 'react'
import { MapPin, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import './track-map-viewer.css'

interface TrackMapViewerProps {
  track: string
  pdfUrl?: string
  mapData?: {
    corners: number
    length: string
    direction: string
    elevation: string
    surface: string
    sectors?: number
  }
}

export default function TrackMapViewer({ track, pdfUrl, mapData }: TrackMapViewerProps) {
  const [zoom, setZoom] = useState(100)

  // Track name mapping
  const trackNames: Record<string, string> = {
    'barber': 'Barber Motorsports Park',
    'cota': 'Circuit of the Americas',
    'indianapolis': 'Indianapolis Motor Speedway',
    'road-america': 'Road America',
    'sebring': 'Sebring International Raceway',
    'sonoma': 'Sonoma Raceway',
    'vir': 'Virginia International Raceway'
  }

  const zoomClass = `zoom-${zoom}`

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900/70 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-racing-red" />
          <h3 className="font-semibold">{trackNames[track] || track}</h3>
          <span className="text-xs bg-racing-blue/20 text-racing-blue px-2 py-1 rounded">Track Map</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 p-4">
        {/* Map Display */}
        <div className="lg:col-span-2 bg-gray-900/50 rounded-lg p-4 min-h-[400px] flex items-center justify-center overflow-auto">
          {pdfUrl ? (
            <div className={`track-map-zoom ${zoomClass}`}>
              <iframe
                src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0`}
                className="w-full h-[500px] border-0 rounded-lg"
                title={`${track} Track Map`}
              />
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Track map not available</p>
              <p className="text-xs mt-2">Upload PDF to Google Drive</p>
            </div>
          )}
        </div>

        {/* Map Data Panel */}
        <div className="space-y-3">
          <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-racing-red mb-3 uppercase tracking-wide">
              Track Information
            </h4>
            <div className="space-y-2 text-sm">
              {mapData?.corners && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Corners:</span>
                  <span className="font-semibold">{mapData.corners}</span>
                </div>
              )}
              {mapData?.length && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Length:</span>
                  <span className="font-semibold">{mapData.length}</span>
                </div>
              )}
              {mapData?.direction && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Direction:</span>
                  <span className="font-semibold">{mapData.direction}</span>
                </div>
              )}
              {mapData?.elevation && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Elevation:</span>
                  <span className="font-semibold">{mapData.elevation}</span>
                </div>
              )}
              {mapData?.surface && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Surface:</span>
                  <span className="font-semibold">{mapData.surface}</span>
                </div>
              )}
              {mapData?.sectors && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Sectors:</span>
                  <span className="font-semibold">{mapData.sectors}</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Features */}
          <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-racing-blue mb-3 uppercase tracking-wide">
              Key Features
            </h4>
            <div className="space-y-2 text-xs text-gray-300">
              {track === 'indianapolis' && (
                <>
                  <p>• Famous 2.5-mile oval + road course</p>
                  <p>• High-speed straights & tight infield</p>
                  <p>• Challenging elevation changes</p>
                </>
              )}
              {track === 'barber' && (
                <>
                  <p>• 17 turns with elevation changes</p>
                  <p>• Challenging downhill sections</p>
                  <p>• Beautiful natural terrain track</p>
                </>
              )}
              {track === 'cota' && (
                <>
                  <p>• 20 turns, counter-clockwise</p>
                  <p>• Inspired by famous F1 circuits</p>
                  <p>• Dramatic elevation at Turn 1</p>
                </>
              )}
              {track === 'road-america' && (
                <>
                  <p>• 4.048 miles, 14 turns</p>
                  <p>• Fast, flowing natural road course</p>
                  <p>• Famous Kink at 150+ mph</p>
                </>
              )}
              {track === 'sebring' && (
                <>
                  <p>• 17 turns, bumpy surface</p>
                  <p>• Historic airfield circuit</p>
                  <p>• Ultra-challenging for setups</p>
                </>
              )}
              {track === 'sonoma' && (
                <>
                  <p>• 12 turns with steep hills</p>
                  <p>• 160 feet elevation change</p>
                  <p>• Technical, physical circuit</p>
                </>
              )}
              {track === 'vir' && (
                <>
                  <p>• 17 turns, 3.27 miles</p>
                  <p>• Rolling hills layout</p>
                  <p>• Mix of high & low-speed corners</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
