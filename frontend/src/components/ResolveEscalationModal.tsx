import React, { useState } from 'react';
import { X, Scale, CheckCircle2, RefreshCw, AlertOctagon, AlertCircle } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface ResolveEscalationModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, action: 'RELEASE' | 'REFUND' | 'SPLIT') => Promise<void>;
}

export const ResolveEscalationModal: React.FC<ResolveEscalationModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !task) return null;

  const [selectedAction, setSelectedAction] = useState<'RELEASE' | 'REFUND' | 'SPLIT'>('SPLIT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      await onSubmit(task.id, selectedAction);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve escalation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bio-card border border-purple-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl hud-border font-mono">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-purple-400">
            <Scale className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Arbitrate Escalated / Disputed Assay</h3>
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

        <div className="bg-bio-dark border border-bio-border p-3 rounded text-xs space-y-1.5 mb-4">
          <p className="text-slate-400">Assay: <span className="text-slate-200 font-bold">{task.assay_name}</span></p>
          <p className="text-slate-400">Escrow Bounty: <span className="text-bio-emerald font-bold">{parseInt(task.escrow_amount).toLocaleString()} GEN</span></p>
          <p className="text-slate-400">Lab Stake: <span className="text-bio-cyan font-bold">{parseInt(task.lab_stake).toLocaleString()} GEN</span></p>
          <p className="text-bio-amber text-[11px] mt-1 border-t border-bio-border pt-1">Reason: {task.reason}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-2">Select Settlement Verdict</label>
            
            <div className="space-y-2">
              
              <button
                type="button"
                onClick={() => setSelectedAction('SPLIT')}
                className={`w-full p-3 rounded border text-left transition ${
                  selectedAction === 'SPLIT'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold'
                    : 'bg-bio-dark border-bio-border text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">50/50 SPLIT (Equitable Compromise)</span>
                  <Scale className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                  50% bounty + stake returned to Lab; 50% bounty returned to Sponsor.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('RELEASE')}
                className={`w-full p-3 rounded border text-left transition ${
                  selectedAction === 'RELEASE'
                    ? 'bg-bio-emerald/20 border-bio-emerald text-bio-emerald font-bold'
                    : 'bg-bio-dark border-bio-border text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">RELEASE (100% to Lab)</span>
                  <CheckCircle2 className="w-4 h-4 text-bio-emerald" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                  100% escrow bounty + lab stake disbursed to Replication Lab.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('REFUND')}
                className={`w-full p-3 rounded border text-left transition ${
                  selectedAction === 'REFUND'
                    ? 'bg-bio-crimson/20 border-bio-crimson text-bio-crimson font-bold'
                    : 'bg-bio-dark border-bio-border text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">REFUND (Full Return + Slash to Sponsor)</span>
                  <AlertOctagon className="w-4 h-4 text-bio-crimson" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-normal">
                  100% escrow bounty + slashed lab stake returned to Sponsor DAO.
                </p>
              </button>

            </div>
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
              className="px-5 py-2 rounded bg-purple-600 text-white font-bold hover:bg-purple-500 transition flex items-center space-x-1.5"
            >
              <Scale className="w-4 h-4" />
              <span>{loading ? "Executing..." : `Enforce ${selectedAction} Settlement`}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
