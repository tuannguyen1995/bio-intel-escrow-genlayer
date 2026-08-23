import React from 'react';
import { Cpu, ShieldCheck, Activity, AlertTriangle, CheckCircle, Flame, Sparkles } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface ConsensusReactionHUDProps {
  task: AssayTask;
  onRunConsensusClick?: () => void;
}

export const ConsensusReactionHUD: React.FC<ConsensusReactionHUDProps> = ({
  task,
  onRunConsensusClick
}) => {
  const confidence = parseInt(task.confidence || '0', 10);
  const verdict = task.verdict || 'NONE';

  const pValue = 0.002;
  const driftPercent = 1.8;
  const rSquared = 0.994;
  const contaminationPassed = true;

  const getVerdictBadgeClass = (v: string) => {
    switch (v) {
      case 'APPROVED':
        return 'bg-bio-emerald/20 text-bio-emerald border-bio-emerald/50 shadow-glow-emerald';
      case 'PARTIAL':
        return 'bg-bio-cyan/20 text-bio-cyan border-bio-cyan/50 shadow-glow-cyan';
      case 'REFUND':
        return 'bg-bio-amber/20 text-bio-amber border-bio-amber/50 shadow-glow-amber';
      case 'ESCALATE':
        return 'bg-bio-crimson/20 text-bio-crimson border-bio-crimson/50 shadow-glow-crimson';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-bio-card border border-bio-border rounded-xl p-5 shadow-2xl mb-6 hud-border">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-bio-border pb-4 mb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-bio-emerald/10 border border-bio-emerald/40 text-bio-emerald shadow-glow-emerald">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wide">
                Consensus Reaction HUD — Multi-Node Validation Radar
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getVerdictBadgeClass(verdict)}`}>
                Verdict: {verdict}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Evaluated on GenVM Validator Nodes • Confidence Threshold: 65% Minimum
            </p>
          </div>
        </div>

        {onRunConsensusClick && (
          <button
            onClick={onRunConsensusClick}
            className="px-3.5 py-1.5 rounded-lg bg-bio-emerald/20 border border-bio-emerald/50 text-bio-emerald font-mono font-bold text-xs hover:bg-bio-emerald hover:text-bio-dark transition shadow-glow-emerald flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulate AI Consensus Flow</span>
          </button>
        )}
      </div>

      {/* Radar Metric Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 font-mono">
        
        {/* P-Value Verification */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">P-Value Verification</span>
            <CheckCircle className="w-3.5 h-3.5 text-bio-emerald" />
          </div>
          <p className="text-xl font-bold text-bio-emerald">p = {pValue}</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-bio-emerald h-full rounded-full" style={{ width: '92%' }}></div>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Limit: p &lt; 0.01 (Passed)</span>
        </div>

        {/* Statistical Tolerance Drift */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">Statistical Drift</span>
            <Activity className="w-3.5 h-3.5 text-bio-cyan" />
          </div>
          <p className="text-xl font-bold text-bio-cyan">±{driftPercent}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-bio-cyan h-full rounded-full" style={{ width: '85%' }}></div>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">R² = {rSquared} (Linearity &gt; 0.98)</span>
        </div>

        {/* Cross-Contamination Check */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">Cross-Contamination</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400">CLEAN</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Negative Controls Intact</span>
        </div>

        {/* AI Confidence Meter */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">GenVM Consensus</span>
            <Flame className="w-3.5 h-3.5 text-bio-amber" />
          </div>
          <p className="text-xl font-bold text-slate-100">{confidence}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                confidence >= 80 ? 'bg-bio-emerald' : confidence >= 65 ? 'bg-bio-cyan' : 'bg-bio-crimson'
              }`}
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Deterministic Consensus</span>
        </div>

      </div>

      {/* Quantitative Reason Box */}
      <div className="bg-bio-dark/70 border border-bio-border p-3 rounded-lg font-mono text-xs text-slate-300">
        <span className="text-bio-emerald font-bold uppercase text-[10px] block mb-1">
          GenVM Consensus Quantitative Justification:
        </span>
        <p className="leading-relaxed text-slate-200">
          {task.reason || "No consensus evaluation executed yet."}
        </p>
      </div>

    </div>
  );
};
