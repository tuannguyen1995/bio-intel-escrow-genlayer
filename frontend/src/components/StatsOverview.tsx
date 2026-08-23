import React from 'react';
import { Vault, FlaskConical, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface StatsOverviewProps {
  tasks: AssayTask[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ tasks }) => {
  const totalEscrowed = tasks.reduce((sum, t) => sum + BigInt(t.escrow_amount || '0') + BigInt(t.lab_stake || '0'), 0n);
  const openBounties = tasks.filter(t => t.status === 'OPEN').length;
  const activeReplications = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'AWAITING_PAYOUT').length;
  const activeDisputes = tasks.filter(t => t.status === 'DISPUTED' || t.status === 'ESCALATED').length;
  const verifiedCount = tasks.filter(t => t.verdict === 'APPROVED' || t.status === 'CLOSED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Escrow Vault */}
      <div className="hud-border bg-bio-card p-4 rounded-xl border border-bio-border flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Value Locked</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-2xl font-mono font-bold text-bio-emerald tracking-tight">
              {totalEscrowed.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-bio-emerald font-semibold">GEN</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">Escrowed + Lab Stakes</p>
        </div>
        <div className="p-3 rounded-lg bg-bio-emerald/10 text-bio-emerald border border-bio-emerald/30 shadow-glow-emerald">
          <Vault className="w-6 h-6" />
        </div>
      </div>

      {/* Active Experiments */}
      <div className="hud-border bg-bio-card p-4 rounded-xl border border-bio-border flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Replications</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-bio-cyan tracking-tight">
              {activeReplications}
            </span>
            <span className="text-xs font-mono text-slate-400">({openBounties} Open)</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">Lab Experiments Live</p>
        </div>
        <div className="p-3 rounded-lg bg-bio-cyan/10 text-bio-cyan border border-bio-cyan/30 shadow-glow-cyan">
          <FlaskConical className="w-6 h-6" />
        </div>
      </div>

      {/* AI Verified Science */}
      <div className="hud-border bg-bio-card p-4 rounded-xl border border-bio-border flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">AI Verified Assays</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-400 tracking-tight">
              {verifiedCount}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">99.2% Accuracy</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">GenVM Consensus Passed</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

      {/* Active Disputes & Cooling Off */}
      <div className="hud-border bg-bio-card p-4 rounded-xl border border-bio-border flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Disputes & Arbitration</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-2xl font-mono font-bold tracking-tight ${activeDisputes > 0 ? 'text-bio-amber' : 'text-slate-300'}`}>
              {activeDisputes}
            </span>
            <span className="text-xs font-mono text-slate-400">Tasks Locked</span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">24h Dispute Protection</p>
        </div>
        <div className={`p-3 rounded-lg border ${activeDisputes > 0 ? 'bg-bio-amber/10 text-bio-amber border-bio-amber/30 shadow-glow-amber' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

    </div>
  );
};
