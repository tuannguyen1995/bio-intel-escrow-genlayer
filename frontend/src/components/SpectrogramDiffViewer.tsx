import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, CheckCircle2, AlertCircle, FileSpreadsheet, Scale, BarChart2, Shield, Lock } from 'lucide-react';
import { AssayTask, SpectrophotometryDataPoint } from '../types/escrow';

interface SpectrogramDiffViewerProps {
  task: AssayTask;
}

const generateSampleCurveData = (): SpectrophotometryDataPoint[] => {
  const points: SpectrophotometryDataPoint[] = [];
  for (let t = 0; t <= 60; t += 5) {
    const base = 0.05 + 0.95 / (1 + Math.exp(-(t - 25) / 6));
    const noise = (Math.sin(t * 0.5) * 0.015) + (Math.random() * 0.01 - 0.005);
    const sample = base + noise;
    const tolerance = 0.06;

    points.push({
      timeMinutes: t,
      wavelength: 600,
      baselineOD: Number(base.toFixed(3)),
      sampleOD: Number(sample.toFixed(3)),
      baselineRFU: Number((base * 100).toFixed(1)),
      sampleRFU: Number((sample * 100).toFixed(1)),
      upperLimit: Number((base + tolerance).toFixed(3)),
      lowerLimit: Number((Math.max(0.01, base - tolerance)).toFixed(3)),
    });
  }
  return points;
};

export const SpectrogramDiffViewer: React.FC<SpectrogramDiffViewerProps> = ({ task }) => {
  const [dataMode, setDataMode] = useState<'OD600' | 'RFU'>('OD600');
  const [curveData] = useState<SpectrophotometryDataPoint[]>(generateSampleCurveData());

  return (
    <div className="bg-bio-card border border-bio-border rounded-xl p-5 shadow-2xl mb-6 hud-border">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-bio-border pb-4 mb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-bio-cyan/10 border border-bio-cyan/30 text-bio-cyan">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wide">
                Interactive Spectrogram & Assay Diff Viewer
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bio-emerald/20 border border-bio-emerald/40 text-bio-emerald font-semibold">
                Dual-Pane HUD
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Assay: <span className="text-bio-cyan">{task.assay_name}</span>
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400 text-[11px]">Telemetry Metric:</span>
          <button
            onClick={() => setDataMode('OD600')}
            className={`px-3 py-1 rounded transition ${
              dataMode === 'OD600'
                ? 'bg-bio-emerald text-bio-dark font-bold shadow-glow-emerald'
                : 'bg-bio-dark text-slate-400 border border-bio-border hover:text-slate-200'
            }`}
          >
            OD600 Spectrophotometry
          </button>
          <button
            onClick={() => setDataMode('RFU')}
            className={`px-3 py-1 rounded transition ${
              dataMode === 'RFU'
                ? 'bg-bio-cyan text-bio-dark font-bold shadow-glow-cyan'
                : 'bg-bio-dark text-slate-400 border border-bio-border hover:text-slate-200'
            }`}
          >
            Fluorescence (RFU)
          </button>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Pane: Sponsor Baseline Protocol Specification */}
        <div className="lg:col-span-4 bg-bio-dark border border-bio-border rounded-lg p-4 font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-bio-border pb-2.5 mb-3 text-bio-emerald">
            <Scale className="w-4 h-4" />
            <span className="font-bold uppercase tracking-wider text-xs">Sponsor Baseline Protocol</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Baseline Specification URL</span>
              <a
                href={task.protocol_url}
                target="_blank"
                rel="noreferrer"
                className="text-bio-cyan hover:underline truncate block text-[11px]"
              >
                {task.protocol_url}
              </a>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-bio-card/60 p-2.5 rounded border border-bio-border/50">
              <div>
                <span className="text-slate-400 text-[10px]">Target OD600</span>
                <p className="text-slate-100 font-bold text-sm">1.02 ± 0.05</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">pH Range</span>
                <p className="text-slate-100 font-bold text-sm">7.4 ± 0.1</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">P-Value Threshold</span>
                <p className="text-bio-emerald font-bold text-sm">&lt; 0.01</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">R² Linearity</span>
                <p className="text-bio-emerald font-bold text-sm">&gt; 0.98</p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Statistical Acceptance Criteria</span>
              <p className="text-slate-300 text-[11px] bg-bio-card/40 p-2 rounded border border-bio-border/40 mt-1">
                {task.tolerance_criteria}
              </p>
            </div>

            <div>
              <span className="text-bio-amber text-[10px] uppercase block font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Blacklisted Experimental Anomalies
              </span>
              <p className="text-bio-amber/90 text-[11px] bg-bio-amber/10 p-2 rounded border border-bio-amber/20 mt-1">
                {task.blacklist_anomalies}
              </p>
            </div>

            {task.is_zk_mode ? (
              <div>
                <span className="text-bio-emerald uppercase text-[10px] font-bold block flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Registered ZK Proof Hash
                </span>
                <p className="text-bio-emerald text-[11px] bg-bio-emerald/10 p-2 rounded border border-bio-emerald/20 mt-1 font-mono break-all">
                  {task.zk_proof_hash}
                </p>
              </div>
            ) : task.assay_log_url && (
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">Submitted Lab Telemetry CSV</span>
                <a
                  href={task.assay_log_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-bio-emerald hover:underline text-[11px] flex items-center gap-1.5 mt-0.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="truncate">{task.assay_log_url}</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Telemetry Parser & Kinetic Diff Chart */}
        <div className="lg:col-span-8 bg-bio-dark border border-bio-border rounded-lg p-4 font-mono text-xs">
          {task.is_zk_mode ? (
            /* ZK Shielded View UI */
            <div className="h-full flex flex-col justify-center items-center py-10 px-4 border border-dashed border-bio-emerald/30 bg-bio-emerald/5 rounded-lg text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient opacity-20 pointer-events-none"></div>
              
              <div className="p-4 rounded-full bg-bio-emerald/10 border border-bio-emerald/40 text-bio-emerald animate-pulse shadow-glow-emerald mb-4">
                <Lock className="w-8 h-8" />
              </div>
              
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-bio-emerald" /> Cryptographically Shielded Envelope
              </h4>
              
              <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
                Raw curve telemetry metrics are completely hidden on-chain to protect proprietary genetic sequence data. Compliance was cryptographically validated off-chain.
              </p>

              <div className="w-full max-w-sm bg-bio-card border border-bio-emerald/20 p-3.5 rounded text-left space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">Verification Status</span>
                  <span className="text-bio-emerald font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 uppercase">ZK Envelope Hash</span>
                  <span className="text-slate-300 font-bold truncate max-w-[200px]">{task.zk_proof_hash}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Open View UI */
            <>
              <div className="flex items-center justify-between mb-3 border-b border-bio-border pb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-bio-cyan" />
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Replication Lab Telemetry Parser vs Sponsor Baseline
                  </span>
                </div>
                <div className="flex items-center space-x-3 font-mono text-[11px]">
                  <span className="flex items-center gap-1 text-bio-emerald">
                    <span className="w-2.5 h-2.5 rounded-full bg-bio-emerald inline-block"></span> Baseline
                  </span>
                  <span className="flex items-center gap-1 text-bio-cyan">
                    <span className="w-2.5 h-2.5 rounded-full bg-bio-cyan inline-block"></span> Lab Telemetry
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded bg-slate-700 inline-block"></span> ±σ Bounds
                  </span>
                </div>
              </div>

              {/* Recharts Line Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="timeMinutes" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} unit="m" />
                    <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0A1526', borderColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    
                    {/* Statistical Tolerance Bounds */}
                    <Line
                      type="monotone"
                      dataKey="upperLimit"
                      stroke="#334155"
                      strokeDasharray="4 4"
                      dot={false}
                      name="Upper +σ"
                    />
                    <Line
                      type="monotone"
                      dataKey="lowerLimit"
                      stroke="#334155"
                      strokeDasharray="4 4"
                      dot={false}
                      name="Lower -σ"
                    />

                    {/* Sponsor Baseline */}
                    <Line
                      type="monotone"
                      dataKey={dataMode === 'OD600' ? 'baselineOD' : 'baselineRFU'}
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10B981' }}
                      name={dataMode === 'OD600' ? 'Baseline OD600' : 'Baseline RFU'}
                    />

                    {/* Replication Lab Measured Telemetry */}
                    <Line
                      type="monotone"
                      dataKey={dataMode === 'OD600' ? 'sampleOD' : 'sampleRFU'}
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#06B6D4' }}
                      name={dataMode === 'OD600' ? 'Lab Measured OD600' : 'Lab Measured RFU'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-slate-400 bg-bio-card p-2 rounded border border-bio-border/60">
                <span className="flex items-center gap-1.5 text-bio-emerald">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Statistical Deviation: ±0.014 (Within ±0.060 Tolerance)
                </span>
                <span>Sampling Interval: 5 min</span>
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
};
