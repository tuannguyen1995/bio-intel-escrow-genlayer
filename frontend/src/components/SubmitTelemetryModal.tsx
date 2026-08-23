import React, { useState } from 'react';
import { X, FileSpreadsheet, Sparkles, AlertCircle } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface SubmitTelemetryModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    taskId: string;
    assayLogUrl: string;
  }) => Promise<void>;
}

export const SubmitTelemetryModal: React.FC<SubmitTelemetryModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !task) return null;

  const [assayLogUrl, setAssayLogUrl] = useState(task.assay_log_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assayLogUrl.trim().startsWith('http')) {
      setError('Assay telemetry log must be a valid HTTP/HTTPS URL');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        taskId: task.id,
        assayLogUrl: assayLogUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit assay telemetry on-chain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-bio-card border border-bio-cyan/40 rounded-xl max-w-xl w-full p-6 shadow-glow-cyan hud-border font-mono relative">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-cyan">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Submit Replication Telemetry Log (On-Chain)</h3>
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

        <div className="bg-bio-dark border border-bio-border p-3 rounded text-xs space-y-1 mb-4">
          <p className="text-slate-400">Assay Title: <span className="text-slate-200 font-bold">{task.assay_name}</span></p>
          <p className="text-slate-400">Target Task ID: <span className="text-bio-cyan font-bold">{task.id}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Raw Telemetry Log HTTP/HTTPS URL (.CSV / .FASTQ / Spec JSON)
            </label>
            <input
              type="url"
              value={assayLogUrl}
              onChange={(e) => setAssayLogUrl(e.target.value)}
              placeholder="https://your-lab-logs.org/telemetry.csv"
              className="w-full bg-bio-dark border border-bio-cyan rounded px-3 py-2 text-bio-cyan focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-bio-dark/70 rounded border border-bio-border text-slate-400 text-[11px]">
            <span className="text-bio-cyan font-bold uppercase block mb-1">GenVM Consensus Trigger:</span>
            Submitting telemetry executes <code className="text-bio-emerald font-bold">submit_assay_telemetry</code> on GenLayer VM. Validators will render both baseline protocol and lab telemetry logs to produce the on-chain verdict.
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
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Executing On-Chain Consensus..." : "Submit & Run On-Chain Validation"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
