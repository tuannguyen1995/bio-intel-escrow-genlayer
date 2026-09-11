import React, { useState } from 'react';
import { X, FileSpreadsheet, Sparkles, AlertCircle, Shield, CheckCircle, Hash, Cpu } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface SubmitTelemetryModalProps {
  task: AssayTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    taskId: string;
    assayLogUrl: string;
    isZkMode: boolean;
    zkProofHash: string;
    assayLogHash: string;
    labProvenanceSig: string;
    provenanceType: string;
    instrumentId: string;
  }) => Promise<void>;
}

export const SubmitTelemetryModal: React.FC<SubmitTelemetryModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !task) return null;

  const [isZkMode, setIsZkMode] = useState(false);
  const [assayLogUrl, setAssayLogUrl] = useState(task.assay_log_url || 'https://lab-logs.org/telemetry_cas12a_run99.csv');
  const [zkProofHash, setZkProofHash] = useState('');
  const [assayLogHash, setAssayLogHash] = useState('sha256:dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  const [provenanceType, setProvenanceType] = useState('LIMS_RAW_EXPORT');
  const [instrumentId, setInstrumentId] = useState('Biotek-Synergy-H1-SN48821');
  const [labProvenanceSig, setLabProvenanceSig] = useState('0x89abcdef12345678...lab_ed25519_sig');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateHash = () => {
    const rand = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setAssayLogHash(`sha256:${rand}4a3b2c1d9876543210fedcba`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isZkMode && !assayLogUrl.trim().startsWith('http') && !assayLogUrl.trim().startsWith('ipfs://')) {
      setError('Assay telemetry log must be a valid HTTP/HTTPS or IPFS URL in standard mode');
      return;
    }

    if (isZkMode && !zkProofHash.trim()) {
      setError('Cryptographic proof hash is required in ZK compliance mode');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        taskId: task.id,
        assayLogUrl: isZkMode ? '' : assayLogUrl.trim(),
        isZkMode,
        zkProofHash: isZkMode ? zkProofHash.trim() : '',
        assayLogHash: assayLogHash.trim(),
        labProvenanceSig: labProvenanceSig.trim(),
        provenanceType: provenanceType.trim(),
        instrumentId: instrumentId.trim(),
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
      <div className="bg-bio-card border border-bio-cyan/40 rounded-xl max-w-xl w-full p-6 shadow-glow-cyan hud-border font-mono relative max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-cyan">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase">Submit Replication Telemetry & Provenance</h3>
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
          {/* ZK-Shielded Toggle Switch */}
          <div className="flex items-center justify-between p-3 bg-bio-emerald/5 border border-bio-emerald/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className={`w-5 h-5 ${isZkMode ? "text-bio-emerald" : "text-slate-500"}`} />
              <div>
                <p className="text-slate-200 font-bold text-xs uppercase">ZK-Shielded Compliance Mode</p>
                <p className="text-[10px] text-slate-400">Hide raw laboratory telemetry & submit cryptographic compliance proof hash</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isZkMode}
                onChange={() => setIsZkMode(!isZkMode)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bio-emerald peer-checked:after:bg-bio-dark"></div>
            </label>
          </div>

          {!isZkMode ? (
            <div>
              <label className="text-slate-400 uppercase text-[10px] block mb-1">
                Raw Telemetry Log URL (HTTP/HTTPS or IPFS)
              </label>
              <input
                type="text"
                value={assayLogUrl}
                onChange={(e) => setAssayLogUrl(e.target.value)}
                placeholder="https://your-lab-logs.org/telemetry.csv or ipfs://..."
                className="w-full bg-bio-dark border border-bio-cyan rounded px-3 py-2 text-bio-cyan focus:outline-none"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-slate-400 uppercase text-[10px] block mb-1">
                Off-Chain Cryptographic Compliance Proof Hash (ZK SHA256/Poseidon Hash)
              </label>
              <input
                type="text"
                value={zkProofHash}
                onChange={(e) => setZkProofHash(e.target.value)}
                placeholder="0x7f394c8d9ea8e09cb2d398f828a2cf39811c75b28d6..."
                className="w-full bg-bio-dark border border-bio-emerald rounded px-3 py-2 text-bio-emerald focus:outline-none font-mono"
                required
              />
            </div>
          )}

          {/* Evidence Integrity Hash Commitment */}
          <div className="p-3 bg-bio-dark/70 border border-bio-cyan/40 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-bio-cyan font-bold uppercase text-[10px] flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />
                Immutable Telemetry Hash Commitment (Evidence Integrity)
              </span>
              <button
                type="button"
                onClick={handleGenerateHash}
                className="text-[10px] px-2 py-0.5 rounded bg-bio-cyan/20 border border-bio-cyan/40 text-bio-cyan hover:bg-bio-cyan hover:text-bio-dark transition"
              >
                Auto-Hash
              </button>
            </div>
            <input
              type="text"
              value={assayLogHash}
              onChange={(e) => setAssayLogHash(e.target.value)}
              placeholder="sha256:... or IPFS CID"
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-1.5 text-slate-200 text-[11px] focus:border-bio-cyan focus:outline-none font-mono"
            />
          </div>

          {/* Provenance & Hardware Attestation */}
          <div className="p-3 bg-bio-dark/70 border border-bio-emerald/40 rounded-lg space-y-3">
            <div className="flex items-center space-x-1.5 text-bio-emerald font-bold text-[11px] uppercase">
              <Cpu className="w-4 h-4" />
              <span>Laboratory Provenance & Hardware Attestation</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Provenance Type</label>
                <select
                  value={provenanceType}
                  onChange={(e) => setProvenanceType(e.target.value)}
                  className="w-full bg-bio-dark border border-bio-border rounded px-2.5 py-1.5 text-slate-200 text-[11px] focus:border-bio-emerald focus:outline-none"
                >
                  <option value="LIMS_RAW_EXPORT">LIMS Export Audit</option>
                  <option value="SPECTROMETER_HARDWARE_ATTESTATION">Hardware Attestation</option>
                  <option value="CERTIFIED_LAB_SIG">Certified Lab Signature</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Instrument ID / Model</label>
                <input
                  type="text"
                  value={instrumentId}
                  onChange={(e) => setInstrumentId(e.target.value)}
                  placeholder="e.g. Biotek-Synergy-H1-SN48821"
                  className="w-full bg-bio-dark border border-bio-border rounded px-2.5 py-1.5 text-slate-200 text-[11px] focus:border-bio-emerald focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-slate-400 uppercase text-[10px] block mb-1">Lab / Hardware Attestation Signature</label>
              <input
                type="text"
                value={labProvenanceSig}
                onChange={(e) => setLabProvenanceSig(e.target.value)}
                placeholder="0x... ECDSA signature from registered laboratory device"
                className="w-full bg-bio-dark border border-bio-border rounded px-2.5 py-1.5 text-slate-200 text-[11px] focus:border-bio-emerald focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-bio-dark/70 rounded border border-bio-border text-slate-400 text-[11px]">
            <span className="text-bio-cyan font-bold uppercase block mb-1">GenVM Consensus Trigger:</span>
            Multi-Agent AI validators evaluate kinetic curve linearity, p-values, immutable content hash, and laboratory provenance attestations on-chain.
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
              className="px-5 py-2 rounded bg-bio-cyan text-bio-dark font-bold hover:opacity-90 transition shadow-glow-cyan flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Submitting Telemetry..." : "Submit to Multi-Agent Board"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
