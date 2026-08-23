import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { AssayTask, UserRole } from '../types/escrow';

interface CountdownClockProps {
  task: AssayTask;
  currentRole: UserRole;
  userAddress: string;
  onRaiseDisputeClick: () => void;
  onFinalizePayoutClick: () => void;
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  task,
  currentRole,
  userAddress,
  onRaiseDisputeClick,
  onFinalizePayoutClick,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isElapsed: boolean }>({
    hours: 24,
    minutes: 0,
    seconds: 0,
    isElapsed: false,
  });

  const payoutReadyAt = parseInt(task.payout_ready_at || '0', 10);

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      if (!payoutReadyAt || payoutReadyAt <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isElapsed: true });
        return;
      }

      const diff = payoutReadyAt - now;
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isElapsed: true });
      } else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft({ hours: h, minutes: m, seconds: s, isElapsed: false });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [payoutReadyAt]);

  const canDispute = task.status === 'AWAITING_PAYOUT' && !timeLeft.isElapsed;
  const canFinalize = task.status === 'AWAITING_PAYOUT' && (timeLeft.isElapsed || payoutReadyAt <= 0);

  return (
    <div className="bg-gradient-to-r from-bio-card via-bio-dark to-bio-card border border-bio-amber/40 rounded-xl p-5 shadow-glow-amber mb-6 font-mono hud-border">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* LED Timer Display */}
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-bio-amber/10 border border-bio-amber/50 text-bio-amber shadow-glow-amber animate-pulse-fast">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-bio-amber uppercase tracking-wider">
                24h Dispute Cooling-Off Countdown
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-bio-amber/20 text-bio-amber border border-bio-amber/40">
                Space Station LED Clock
              </span>
            </div>
            
            {/* Digital Clock Display */}
            <div className="flex items-baseline space-x-2 mt-1">
              <div className="bg-bio-dark border border-bio-amber/60 px-3 py-1 rounded text-2xl md:text-3xl font-bold font-mono text-bio-amber shadow-inner tracking-widest">
                {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <span className="text-xs text-slate-400">
                {timeLeft.isElapsed ? "(Cooling-off window ended)" : "(Dispute window active)"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dispute Button */}
          {task.status === 'AWAITING_PAYOUT' && (
            <button
              onClick={onRaiseDisputeClick}
              disabled={!canDispute}
              className={`px-4 py-2.5 rounded-lg border font-mono font-bold text-xs flex items-center space-x-2 transition shadow-lg ${
                canDispute
                  ? 'bg-bio-amber/20 border-bio-amber text-bio-amber hover:bg-bio-amber hover:text-bio-dark shadow-glow-amber'
                  : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Raise Scientific Dispute</span>
            </button>
          )}

          {/* Finalize Payout Button */}
          {task.status === 'AWAITING_PAYOUT' && (
            <button
              onClick={onFinalizePayoutClick}
              className={`px-4 py-2.5 rounded-lg font-mono font-bold text-xs flex items-center space-x-2 transition ${
                canFinalize
                  ? 'bg-bio-emerald text-bio-dark hover:opacity-90 shadow-glow-emerald'
                  : 'bg-bio-emerald/20 text-bio-emerald border border-bio-emerald/40 hover:bg-bio-emerald/30'
              }`}
            >
              {canFinalize ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{canFinalize ? "Finalize Payout Now" : "Finalize (T+24h Enforced)"}</span>
            </button>
          )}

        </div>

      </div>

      <div className="mt-3 pt-3 border-t border-bio-amber/20 text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          • If no dispute is raised within 24h, payout automatically unlocks for Replication Lab.
        </span>
        <span className="text-bio-amber font-semibold">Status: AWAITING PAYOUT</span>
      </div>

    </div>
  );
};
