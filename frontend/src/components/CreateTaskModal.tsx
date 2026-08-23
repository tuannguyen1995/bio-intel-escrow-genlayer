import React, { useState } from 'react';
import { X, Dna, PlusCircle, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    taskId: string;
    assayName: string;
    protocolUrl: string;
    toleranceCriteria: string;
    blacklistAnomalies: string;
    escrowAmount: bigint;
  }) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [taskId, setTaskId] = useState(`assay_${Date.now().toString().slice(-6)}`);
  const [assayName, setAssayName] = useState('Cas12a Cleavage Kinetic Replication Assay');
  const [protocolUrl, setProtocolUrl] = useState('https://protocols.io/spec/crispr_cleavage.json');
  const [toleranceCriteria, setToleranceCriteria] = useState('p-value < 0.01, R^2 > 0.98, CV < 5%');
  const [blacklistAnomalies, setBlacklistAnomalies] = useState('Negative control cleaved, sensor saturation, reagent degradation');
  const [escrowAmount, setEscrowAmount] = useState('20000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskId.trim() || !assayName.trim() || !protocolUrl.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!protocolUrl.startsWith('http')) {
      setError('Protocol specification must be a valid HTTP/HTTPS URL');
      return;
    }

    const amountNum = parseInt(escrowAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Escrow bounty must be greater than 0 GEN');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        taskId: taskId.trim(),
        assayName: assayName.trim(),
        protocolUrl: protocolUrl.trim(),
        toleranceCriteria: toleranceCriteria.trim(),
        blacklistAnomalies: blacklistAnomalies.trim(),
        escrowAmount: BigInt(amountNum),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create assay task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bio-card border border-bio-emerald/40 rounded-xl max-w-xl w-full p-6 shadow-glow-emerald hud-border font-mono relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-emerald">
            <Dna className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Create Biomolecular Assay Bounty</h3>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 uppercase text-[10px] block mb-1">Task ID</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-slate-100 focus:border-bio-emerald focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 uppercase text-[10px] block mb-1">Escrow Bounty (GEN)</label>
              <input
                type="number"
                value={escrowAmount}
                onChange={(e) => setEscrowAmount(e.target.value)}
                className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-bio-emerald font-bold focus:border-bio-emerald focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">Assay Title</label>
            <input
              type="text"
              value={assayName}
              onChange={(e) => setAssayName(e.target.value)}
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-slate-100 focus:border-bio-emerald focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Baseline Protocol Spec HTTP/HTTPS URL
            </label>
            <input
              type="url"
              value={protocolUrl}
              onChange={(e) => setProtocolUrl(e.target.value)}
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-bio-cyan focus:border-bio-cyan focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Statistical Tolerance Criteria ($\pm \sigma$, p-value, $R^2$)
            </label>
            <input
              type="text"
              value={toleranceCriteria}
              onChange={(e) => setToleranceCriteria(e.target.value)}
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-slate-100 focus:border-bio-emerald focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Blacklisted Experimental Anomalies
            </label>
            <textarea
              rows={2}
              value={blacklistAnomalies}
              onChange={(e) => setBlacklistAnomalies(e.target.value)}
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-bio-amber focus:border-bio-amber focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3 border-t border-bio-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded bg-bio-emerald text-bio-dark font-bold hover:opacity-90 transition shadow-glow-emerald flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? "Posting Escrow..." : "Deposit Bounty & Publish"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
