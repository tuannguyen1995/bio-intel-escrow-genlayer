import React, { useState } from 'react';
import { X, FileSpreadsheet, Send, Sparkles, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface SubmitTelemetryModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    taskId: string;
    assayLogUrl: string;
    simulatedVerdict?: { verdict: 'APPROVED' | 'PARTIAL' | 'REFUND' | 'ESCALATE'; confidence: number; reason: string };
  }) => Promise<void>;
  onTriggerConsensusAnimation: (task: AssayTask, logUrl: string) => void;
}

export const SubmitTelemetryModal: React.FC<SubmitTelemetryModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
  onTriggerConsensusAnimation,
}) => {
  if (!isOpen || !task) return null;

  const [assayLogUrl, setAssayLogUrl] = useState('https://lab-logs.org/telemetry_cas12a_run99.csv');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const PRESETS = [
    {
      label: "Passing Sigmoidal Kinetic Curve (APPROVED)",
      url: "https://lab-logs.org/telemetry_cas12a_run99.csv",
      verdict: 'APPROVED' as const,
      confidence: 98,
      reason: "Kinetic cleavage curve matches baseline. R^2 = 0.994 (> 0.98), p < 0.001. All negative controls intact."
    },
    {
      label: "Marginal Yield Offset (PARTIAL)",
      url: "https://lab-logs.org/telemetry_partial_yield_batch2.csv",
      verdict: 'PARTIAL' as const,
      confidence: 76,
      reason: "End-point yield 12% lower than baseline but kinetic mechanism & negative controls remain intact."
    },
    {
      label: "Negative Control Cleavage Failure (REFUND)",
      url: "https://lab-logs.org/telemetry_failed_control_batch8.csv",
      verdict: 'REFUND' as const,
      confidence: 95,
      reason: "Critical Failure: Negative control channel exhibited background cleavage (RFU > 0.45)."
    },
    {
      label: "Noisy Sensor Baseline (ESCALATE)",
      url: "https://lab-logs.org/telemetry_sensor_noise_err.csv",
      verdict: 'ESCALATE' as const,
      confidence: 45,
      reason: "Confidence score 45% < 65%. Uncalibrated spectrophotometer sensor spikes detected."
    }
  ];

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    setAssayLogUrl(PRESETS[idx].url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!assayLogUrl.trim().startsWith('http')) {
      setError('Assay telemetry log must be a valid HTTP/HTTPS URL');
      return;
    }

    setLoading(true);
    try {
      const activePreset = PRESETS[selectedPresetIndex];
      const sim = {
        verdict: activePreset.verdict,
        confidence: activePreset.confidence,
        reason: activePreset.reason,
      };

      // Trigger animated visualizer
      onTriggerConsensusAnimation(task, assayLogUrl.trim());

      await onSubmit({
        taskId: task.id,
        assayLogUrl: assayLogUrl.trim(),
        simulatedVerdict: sim,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit assay telemetry');
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
            <h3 className="font-bold text-sm uppercase">Submit Lab Replication Telemetry Log</h3>
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
          
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Select Sample Telemetry Preset
            </label>
            <div className="space-y-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`w-full text-left p-2.5 rounded border transition flex items-center justify-between ${
                    selectedPresetIndex === idx
                      ? 'bg-bio-cyan/10 border-bio-cyan text-bio-cyan font-bold'
                      : 'bg-bio-dark border-bio-border text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 ml-2">
                    {p.verdict}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Raw Telemetry Log HTTP/HTTPS URL (.CSV / .FASTQ / Spec JSON)
            </label>
            <input
              type="url"
              value={assayLogUrl}
              onChange={(e) => setAssayLogUrl(e.target.value)}
              className="w-full bg-bio-dark border border-bio-cyan rounded px-3 py-2 text-bio-cyan focus:outline-none"
              required
            />
          </div>

          <div className="p-3 bg-bio-dark/70 rounded border border-bio-border text-slate-400 text-[11px]">
            <span className="text-bio-cyan font-bold uppercase block mb-1">GenVM Consensus Trigger:</span>
            GenLayer AI consensus validators will render both protocol specification and raw telemetry logs, evaluating statistical tolerances and negative controls.
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
              <span>{loading ? "Running GenVM Consensus..." : "Submit Log & Run AI Consensus"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
