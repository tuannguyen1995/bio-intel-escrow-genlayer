import React, { useState } from 'react';
import { X, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface AcceptTaskModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, stakeAmount: bigint) => Promise<void>;
}

export const AcceptTaskModal: React.FC<AcceptTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !task) return null;

  const escrowNum = BigInt(task.escrow_amount || '0');
  const minStake = escrowNum / 5n; // 20%
  const [customStake, setCustomStake] = useState(minStake.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const stakeVal = BigInt(customStake || '0');
    if (stakeVal < minStake) {
      setError(`Minimum 20% stake required (${minStake.toString()} GEN)`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(task.id, stakeVal);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to accept task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bio-card border border-bio-cyan/40 rounded-xl max-w-md w-full p-6 shadow-glow-cyan hud-border font-mono">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-cyan">
            <Lock className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Lock Assay & Deposit Lab Stake</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-bio-crimson/10 border border-bio-crimson/40 rounded text-bio-crimson text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-bio-dark border border-bio-border p-3 rounded text-xs space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Assay Title:</span>
            <span className="text-slate-200 font-bold truncate max-w-[200px]">{task.assay_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Sponsor Escrow Bounty:</span>
            <span className="text-bio-emerald font-bold">{parseInt(task.escrow_amount).toLocaleString()} GEN</span>
          </div>
          <div className="flex justify-between border-t border-bio-border/60 pt-1.5">
            <span className="text-bio-cyan font-semibold">Required Minimum Stake (20%):</span>
            <span className="text-bio-cyan font-bold">{parseInt(minStake.toString()).toLocaleString()} GEN</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Your Replication Lab Stake Deposit (GEN)
            </label>
            <input
              type="number"
              value={customStake}
              onChange={(e) => setCustomStake(e.target.value)}
              className="w-full bg-bio-dark border border-bio-cyan rounded px-3 py-2 text-bio-cyan font-bold focus:outline-none"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              • Your stake will be returned in full upon successful AI consensus approval (+ 100% bounty payout).
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-3 border-t border-bio-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded bg-bio-cyan text-bio-dark font-bold hover:opacity-90 transition shadow-glow-cyan flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "Staking..." : "Deposit Stake & Accept Task"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
