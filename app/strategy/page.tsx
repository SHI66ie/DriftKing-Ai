'use client';

import React, { useState, useEffect } from 'react';
import { Target, Shield, Play, Loader2, Info, Compass, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StrategyPage() {
  const [compound, setCompound] = useState('Medium');
  const [trackTemp, setTrackTemp] = useState(38.0);
  const [numLaps, setNumLaps] = useState(45);
  const [baseLapTime, setBaseLapTime] = useState(94.5);
  const [fuelEffect, setFuelEffect] = useState(0.04);
  const [pitStopLoss, setPitStopLoss] = useState(22.0);
  const [numSims, setNumSims] = useState(1000);
  
  const [loading, setLoading] = useState(false);
  const [simResults, setSimResults] = useState<any>(null);
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Auto-generate some sample coordinate arrays for track map mapping (e.g. Sonoma Raceway coords approximation)
  const generateMockTrackData = () => {
    const latBase = 38.1611;
    const lonBase = -122.4547;
    const size = 100;
    const lats: number[] = [];
    const lons: number[] = [];
    const elevations: number[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < size; i++) {
      const angle = (i / size) * 2 * Math.PI;
      // create a race track layout shape (ellipse with perturbations)
      const r = 0.003 * (1 + 0.3 * Math.sin(3 * angle) + 0.1 * Math.cos(7 * angle));
      lats.push(latBase + r * Math.sin(angle));
      lons.push(lonBase + r * Math.cos(angle) * 1.3);
      
      // elevation changes
      elevations.push(50 + 25 * Math.sin(2 * angle) + 5 * Math.cos(5 * angle));
      
      // Speed (lower speeds in sharp corners, higher in straights)
      const curvature = Math.abs(Math.sin(3 * angle));
      speeds.push(240 - 140 * curvature + Math.random() * 10);
    }
    return { lat: lats, lon: lons, elevation: elevations, speed: speeds };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/strategy/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_laps: numLaps,
          track_temp: trackTemp,
          base_lap_time: baseLapTime,
          fuel_effect: fuelEffect,
          pit_stop_loss: pitStopLoss,
          num_simulations: numSims
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackMap = async () => {
    setMapLoading(true);
    try {
      const coords = generateMockTrackData();
      const res = await fetch('http://localhost:8000/api/visualization/track-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.html) {
          setMapHtml(data.html);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
    loadTrackMap();
  }, []);

  const chartData = simResults
    ? simResults.sweep_laps.map((lap: number, idx: number) => ({
        lap,
        raceTime: simResults.mean_race_times[idx],
        risk: simResults.risk_std[idx]
      }))
    : [];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3 mb-4 md:mb-0">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Predictive Strategy Engine</h1>
            <p className="text-slate-400">Monte Carlo pit window sweeps and 3D track speed mapping</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadTrackMap}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-all flex items-center border border-slate-700"
          >
            <Compass className="w-4 h-4 mr-2" />
            Reload Map
          </button>
          <button 
            onClick={runSimulation}
            disabled={loading}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-all flex items-center shadow-md shadow-violet-600/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Sweep
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Parameters Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center">
              <Shield className="w-5 h-5 text-violet-500 mr-2" />
              Simulation Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Tyre Compound</label>
                <select 
                  value={compound} 
                  onChange={(e) => setCompound(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                >
                  <option>Soft</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Track Temperature (°C)</label>
                <input 
                  type="number" 
                  value={trackTemp} 
                  onChange={(e) => setTrackTemp(parseFloat(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  step="0.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Total Laps</label>
                  <input 
                    type="number" 
                    value={numLaps} 
                    onChange={(e) => setNumLaps(parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Base Pace (s)</label>
                  <input 
                    type="number" 
                    value={baseLapTime} 
                    onChange={(e) => setBaseLapTime(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Fuel Weight Effect</label>
                  <input 
                    type="number" 
                    value={fuelEffect} 
                    onChange={(e) => setFuelEffect(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Pit Lane Cost (s)</label>
                  <input 
                    type="number" 
                    value={pitStopLoss} 
                    onChange={(e) => setPitStopLoss(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                    step="0.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Monte Carlo Iterations</label>
                <input 
                  type="number" 
                  value={numSims} 
                  onChange={(e) => setNumSims(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  step="1000"
                  max="50000"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Recommended: 10,000+ for production precision</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
            <Info className="w-4 h-4 text-violet-400 shrink-0" />
            <p>
              Simulates randomized Safety Car timings, wreck liabilities, temperature drops, and human errors on pit stops using parallel Monte Carlo sweep algorithms.
            </p>
          </div>
        </div>

        {/* Right column: Results and Visualizations */}
        <div className="lg:col-span-2 space-y-8">
          {/* Simulation Output Dashboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">Monte Carlo Strategy Sweet Spot</h2>
              {simResults && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-mono font-medium border border-emerald-500/30">
                  Engine: {simResults.engine}
                </span>
              )}
            </div>

            {simResults ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Optimal Pit Lap</span>
                  <span className="text-3xl font-extrabold text-violet-400">Lap {simResults.optimal_pit_lap}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Optimal Total Time</span>
                  <span className="text-3xl font-extrabold text-indigo-400">
                    {Math.floor(simResults.optimal_race_time / 60)}m {(simResults.optimal_race_time % 60).toFixed(1)}s
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 col-span-2 md:col-span-1">
                  <span className="text-xs text-slate-400 block mb-1">Risk Std Dev (Pace Variance)</span>
                  <span className="text-3xl font-extrabold text-pink-400">
                    {simResults.risk_std[simResults.sweep_laps.indexOf(simResults.optimal_pit_lap)]?.toFixed(2)}s
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-28 flex items-center justify-center text-slate-500">
                Click "Run Sweep" to view Monte Carlo calculations
              </div>
            )}

            {/* Sweep Chart */}
            {simResults && (
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="lap" stroke="#94a3b8" label={{ value: 'Pit Stop Lap Choice', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" domain={['dataMin - 5', 'dataMax + 5']} label={{ value: 'Total Race Time (s)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Line type="monotone" dataKey="raceTime" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} name="Mean Race Time (s)" />
                    <Line type="monotone" dataKey="risk" stroke="#ec4899" strokeWidth={1.5} name="Risk (Std Dev)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 3D Track overlay iframe */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center">
              <Compass className="w-5 h-5 text-indigo-400 mr-2" />
              High-Fidelity 3D Speed-Gradient Overlay
            </h2>
            {mapLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                <span>Computing coordinate maps...</span>
              </div>
            ) : mapHtml ? (
              <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-800">
                <iframe 
                  srcDoc={mapHtml} 
                  className="w-full h-full border-none"
                  title="3D Track speed map" 
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                Overlay asset offline. Click Reload Map to compute.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
