import React from 'react';
import { Cpu, ShieldCheck, Activity, AlertTriangle, CheckCircle, Flame, Binary, Dna, ShieldAlert } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface ConsensusReactionHUDProps {
  task: AssayTask;
}

export const ConsensusReactionHUD: React.FC<ConsensusReactionHUDProps> = ({
  task,
}) => {
  const confidence = parseInt(task.confidence || '0', 10);
  const verdict = task.verdict || 'NONE';

  // Parse Multi-Agent votes from the contract reason string
  const reason = task.reason || '';
  const match = reason.match(/\[Statistician:\s*(\w+)\s*\|\s*Biochemist:\s*(\w+)\s*\|\s*Contamination Guard:\s*(\w+)\]/);
  const statisticianVote = match ? match[1] : 'NONE';
  const biochemistVote = match ? match[2] : 'NONE';
  const contaminationVote = match ? match[3] : 'NONE';

  const getVoteColor = (v: string) => {
    switch (v) {
      case 'APPROVED':
        return 'text-bio-emerald';
      case 'PARTIAL':
        return 'text-bio-cyan';
      case 'REFUND':
        return 'text-bio-amber';
      case 'ESCALATE':
        return 'text-bio-crimson';
      default:
        return 'text-slate-500';
    }
  };

  const getVoteBarWidth = (v: string) => {
    switch (v) {
      case 'APPROVED':
        return '100%';
      case 'PARTIAL':
        return '70%';
      case 'REFUND':
        return '40%';
      case 'ESCALATE':
        return '10%';
      default:
        return '0%';
    }
  };

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
              <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                Consensus Reaction HUD — Optimistic Democracy + Eq Principle
                {task.is_zk_mode && (
                  <span className="flex items-center gap-1 bg-bio-emerald/15 border border-bio-emerald/30 text-bio-emerald text-[9px] px-1.5 py-0.2 rounded font-mono lowercase">
                    <ShieldCheck className="w-3 h-3" /> zk-shielded
                  </span>
                )}
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getVerdictBadgeClass(verdict)}`}>
                Verdict: {verdict}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              GenLayer Validator Consensus • Equivalence Principle • Threshold: 65% Min
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-bio-emerald bg-bio-emerald/10 border border-bio-emerald/30 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-bio-emerald animate-pulse"></span>
          <span>100% On-Chain GenVM Storage</span>
        </div>
      </div>

      {/* Multi-Agent Voting Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 font-mono">
        
        {/* Agent 1: Statistician */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">1. Statistician Metric</span>
            <Activity className="w-3.5 h-3.5 text-bio-cyan" />
          </div>
          <p className={`text-lg font-bold ${getVoteColor(statisticianVote)}`}>{statisticianVote}</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full bg-bio-cyan`} style={{ width: getVoteBarWidth(statisticianVote) }}></div>
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">Validates R², p-value, drift</span>
        </div>

        {/* Agent 2: Biochemist */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">2. Biochemist Metric</span>
            <Dna className="w-3.5 h-3.5 text-bio-emerald" />
          </div>
          <p className={`text-lg font-bold ${getVoteColor(biochemistVote)}`}>{biochemistVote}</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full bg-bio-emerald`} style={{ width: getVoteBarWidth(biochemistVote) }}></div>
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">Assesses reagent kinetics</span>
        </div>

        {/* Agent 3: Contamination Guard */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">3. Contamination Guard</span>
            <ShieldAlert className="w-3.5 h-3.5 text-bio-amber" />
          </div>
          <p className={`text-lg font-bold ${getVoteColor(contaminationVote)}`}>{contaminationVote}</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full bg-emerald-400`} style={{ width: getVoteBarWidth(contaminationVote) }}></div>
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">Checks negative controls</span>
        </div>

        {/* Column 4: AI Confidence Meter */}
        <div className="bg-bio-dark p-3.5 rounded-lg border border-bio-border">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px]">Consensus Confidence</span>
            <Flame className="w-3.5 h-3.5 text-bio-amber" />
          </div>
          <p className="text-lg font-bold text-slate-100">{confidence}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                confidence >= 80 ? 'bg-bio-emerald' : confidence >= 65 ? 'bg-bio-cyan' : 'bg-bio-crimson'
              }`}
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
          <span className="text-[9px] text-slate-500 mt-1 block">Requires &gt;= 65% confidence</span>
        </div>

      </div>

      {/* Evidence Integrity & Submitted Laboratory Metadata Audit Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 font-mono text-xs">
        <div className="bg-bio-dark/70 border border-bio-border p-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-bio-cyan" />
            <span className="text-[11px] text-slate-300 font-bold uppercase">Evidence Hash Integrity:</span>
          </div>
          <span className="text-[10px] text-bio-cyan font-semibold">
            {task.assay_log_hash ? `${task.assay_log_hash.slice(0, 18)}... (Committed)` : "Uncommitted (Standard Mode)"}
          </span>
        </div>

        <div className="bg-bio-dark/70 border border-bio-border p-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-bio-emerald" />
            <span className="text-[11px] text-slate-300 font-bold uppercase">Submitted Lab Metadata:</span>
          </div>
          <span className="text-[10px] text-bio-emerald font-semibold">
            {task.instrument_id ? `${task.provenance_type || 'Metadata'}: ${task.instrument_id}` : "Self-Reported Log"}
          </span>
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
