import React from 'react';
import { Dna, ShieldCheck, AlertCircle, FileText, ExternalLink, ArrowRight, Lock, CheckCircle2, AlertTriangle, Scale, RefreshCw } from 'lucide-react';
import { AssayTask, UserRole } from '../types/escrow';

interface TaskCardProps {
  task: AssayTask;
  isSelected: boolean;
  currentRole: UserRole;
  userAddress: string;
  onSelectTask: (task: AssayTask) => void;
  onAcceptClick: (task: AssayTask) => void;
  onSubmitTelemetryClick: (task: AssayTask) => void;
  onRaiseDisputeClick: (task: AssayTask) => void;
  onFinalizePayoutClick: (task: AssayTask) => void;
  onResolveEscalationClick: (task: AssayTask) => void;
  onResolveRefereeClick?: (task: AssayTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  currentRole,
  userAddress,
  onSelectTask,
  onAcceptClick,
  onSubmitTelemetryClick,
  onRaiseDisputeClick,
  onFinalizePayoutClick,
  onResolveEscalationClick,
  onResolveRefereeClick,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded bg-bio-emerald/20 text-bio-emerald border border-bio-emerald/40 font-mono text-[11px] font-bold">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded bg-bio-cyan/20 text-bio-cyan border border-bio-cyan/40 font-mono text-[11px] font-bold">IN PROGRESS</span>;
      case 'AWAITING_PAYOUT':
        return <span className="px-2.5 py-0.5 rounded bg-bio-amber/20 text-bio-amber border border-bio-amber/40 font-mono text-[11px] font-bold animate-pulse-fast">AWAITING PAYOUT</span>;
      case 'NEEDS_REVISION':
        return <span className="px-2.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 font-mono text-[11px] font-bold">NEEDS REVISION</span>;
      case 'DISPUTED':
        return <span className="px-2.5 py-0.5 rounded bg-bio-crimson/20 text-bio-crimson border border-bio-crimson/40 font-mono text-[11px] font-bold">DISPUTED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 font-mono text-[11px] font-bold">ESCALATED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono text-[11px]">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">{status}</span>;
    }
  };

  const minStake = (BigInt(task.escrow_amount || '0') / 5n).toString();

  return (
    <div
      className={`bg-bio-card border rounded-xl p-5 transition-all duration-200 hud-border ${
        isSelected
          ? 'border-bio-emerald shadow-glow-emerald bg-bio-card/90'
          : 'border-bio-border hover:border-slate-700'
      }`}
    >
      
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-mono text-xs text-bio-cyan font-semibold">{task.id}</span>
            {getStatusBadge(task.status)}
          </div>
          <h4 className="font-mono font-bold text-base text-slate-100 leading-snug">
            {task.assay_name}
          </h4>
        </div>

        {/* Escrow Badge */}
        <div className="text-right font-mono shrink-0">
          <span className="text-[10px] text-slate-400 block uppercase">Escrow Bounty</span>
          <span className="text-lg font-bold text-bio-emerald">{parseInt(task.escrow_amount).toLocaleString()} GEN</span>
          {BigInt(task.lab_stake || '0') > 0n && (
            <span className="text-[10px] text-bio-cyan block">+ {parseInt(task.lab_stake).toLocaleString()} Stake</span>
          )}
        </div>
      </div>

      {/* Protocol & Criteria summary */}
      <div className="bg-bio-dark/70 border border-bio-border/60 p-3 rounded-lg font-mono text-xs mb-4 space-y-1.5">
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span>Statistical Criteria:</span>
          <span className="text-slate-200 font-semibold">{task.tolerance_criteria}</span>
        </div>
        <div className="flex justify-between items-center text-slate-400 text-[11px]">
          <span>Anomalies Guard:</span>
          <span className="text-bio-amber text-[10px] truncate max-w-[240px]">{task.blacklist_anomalies}</span>
        </div>
      </div>

      {/* Addresses & Meta */}
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-400 border-t border-bio-border/40 pt-3 mb-4">
        <div>
          <span className="text-slate-500 block text-[10px]">Sponsor DAO</span>
          <span className="text-slate-300 font-semibold truncate block">
            {task.sponsor.slice(0, 8)}...{task.sponsor.slice(-6)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Replication Lab</span>
          <span className="text-slate-300 font-semibold truncate block">
            {task.lab === "0x0000000000000000000000000000000000000000"
              ? "Unassigned"
              : `${task.lab.slice(0, 8)}...${task.lab.slice(-6)}`}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bio-border/60 pt-3">
        
        {/* Inspection Button */}
        <button
          onClick={() => onSelectTask(task)}
          className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center space-x-1.5 transition ${
            isSelected
              ? 'bg-bio-emerald/20 text-bio-emerald border border-bio-emerald/40'
              : 'bg-bio-dark text-slate-300 border border-bio-border hover:border-bio-emerald'
          }`}
        >
          <Dna className="w-3.5 h-3.5 text-bio-cyan" />
          <span>{isSelected ? "Inspecting in HUD" : "Inspect Spectrogram"}</span>
        </button>

        {/* Status Specific Action Triggers */}
        <div className="flex items-center space-x-2">
          
          {/* OPEN: Accept & Stake */}
          {task.status === 'OPEN' && (
            <button
              onClick={() => onAcceptClick(task)}
              className="px-3.5 py-1.5 rounded-lg bg-bio-emerald text-bio-dark font-mono font-bold text-xs hover:opacity-90 transition shadow-glow-emerald flex items-center space-x-1"
            >
              <span>Accept Task (Stake {parseInt(minStake).toLocaleString()} GEN)</span>
            </button>
          )}

          {/* IN_PROGRESS / NEEDS_REVISION: Submit Telemetry */}
          {(task.status === 'IN_PROGRESS' || task.status === 'NEEDS_REVISION') && (
            <button
              onClick={() => onSubmitTelemetryClick(task)}
              className="px-3.5 py-1.5 rounded-lg bg-bio-cyan text-bio-dark font-mono font-bold text-xs hover:opacity-90 transition shadow-glow-cyan flex items-center space-x-1"
            >
              <span>Submit Lab Telemetry Log</span>
            </button>
          )}

          {/* AWAITING_PAYOUT: Finalize or Dispute */}
          {task.status === 'AWAITING_PAYOUT' && (
            <>
              <button
                onClick={() => onRaiseDisputeClick(task)}
                className="px-2.5 py-1.5 rounded bg-bio-amber/20 border border-bio-amber/40 text-bio-amber font-mono text-xs font-bold hover:bg-bio-amber hover:text-bio-dark transition"
              >
                Dispute
              </button>
              <button
                onClick={() => onFinalizePayoutClick(task)}
                className="px-3 py-1.5 rounded bg-bio-emerald text-bio-dark font-mono text-xs font-bold hover:opacity-90 transition shadow-glow-emerald"
              >
                Finalize Payout
              </button>
            </>
          )}

          {/* DISPUTED / ESCALATED: Resolve Escalation & AI Referee */}
          {(task.status === 'DISPUTED' || task.status === 'ESCALATED') && (
            <div className="flex gap-1.5">
              {task.status === 'DISPUTED' && onResolveRefereeClick && (
                <button
                  onClick={() => onResolveRefereeClick(task)}
                  className="px-3 py-1.5 rounded bg-bio-emerald/20 border border-bio-emerald/50 text-bio-emerald font-mono text-xs font-bold hover:bg-bio-emerald hover:text-bio-dark transition"
                >
                  Run AI Referee
                </button>
              )}
              <button
                onClick={() => onResolveEscalationClick(task)}
                className="px-3 py-1.5 rounded bg-purple-500/20 border border-purple-500/50 text-purple-300 font-mono text-xs font-bold hover:bg-purple-500 hover:text-white transition"
              >
                Arbitrate
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
