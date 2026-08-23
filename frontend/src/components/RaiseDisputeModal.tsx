import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, AlertCircle, Coins } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface RaiseDisputeModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, reason: string, appealBondValue: bigint) => Promise<void>;
}

export const RaiseDisputeModal: React.FC<RaiseDisputeModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !task) return null;

  const [reason, setReason] = useState('Plate reader baseline blanking was uncalibrated; negative control drift detected');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const escrowAmount = BigInt(task.escrow_amount);
  const appealBond = escrowAmount / 10n; // 10% Appeal Bond
  const bondInGen = Number(appealBond) / 1e18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Please provide a scientific dispute reason');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(task.id, reason.trim(), appealBond);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to raise dispute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bio-card border border-bio-amber/50 rounded-xl max-w-md w-full p-6 shadow-glow-amber hud-border font-mono text-xs">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-amber">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Raise Scientific Dispute (24h Window)</h3>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Scientific Justification / Anomaly Description
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-bio-dark border border-bio-amber rounded px-3 py-2 text-slate-100 focus:outline-none"
              required
            />
          </div>

          {/* Staking appeal bond information */}
          <div className="p-3 bg-bio-amber/5 border border-bio-amber/20 rounded flex items-center justify-between">
            <div className="flex items-center space-x-2 text-bio-amber">
              <Coins className="w-5 h-5" />
              <div>
                <p className="font-bold text-[10px] uppercase">10% Dispute Appeal Bond Required</p>
                <p className="text-[9px] text-slate-400">Refunded if dispute is validated; Slashed if rejected</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-200 font-bold">{bondInGen.toLocaleString()} GEN</p>
              <p className="text-[8px] text-slate-400">({appealBond.toString()} Wei)</p>
            </div>
          </div>

          <div className="p-3 bg-bio-amber/10 border border-bio-amber/30 rounded text-bio-amber text-[11px]">
            <span className="font-bold uppercase block mb-1">Cooling-Off Freeze:</span>
            Filing a dispute freezes payout, stakes the appeal bond on-chain, and escalates the task to the AI Referee arbitration panel.
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
              className="px-5 py-2 rounded bg-bio-amber text-bio-dark font-bold hover:opacity-90 transition shadow-glow-amber flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{loading ? "Staking & Locking..." : "Stake Bond & File Dispute"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
