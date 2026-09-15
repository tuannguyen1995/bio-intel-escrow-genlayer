import React, { useState } from 'react';
import { X, Dna, PlusCircle, AlertCircle, ShieldCheck, Hash } from 'lucide-react';
import { parseGEN } from '../utils/formatters';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    taskId: string;
    assayName: string;
    protocolUrl: string;
    toleranceCriteria: string;
    blacklistAnomalies: string;
    protocolSpecHash: string;
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
  const [protocolUrl, setProtocolUrl] = useState('https://raw.githubusercontent.com/tuannguyen1995/bio-intel-escrow-genlayer/main/README.md');
  const [protocolSpecHash, setProtocolSpecHash] = useState('sha256:31cd38ee22043e9a5d00e2128385eeb0de686433932a165bf788975657e22bd0');
  const [toleranceCriteria, setToleranceCriteria] = useState('p-value < 0.01, R^2 > 0.98, CV < 5%');
  const [blacklistAnomalies, setBlacklistAnomalies] = useState('Negative control cleaved, sensor saturation, reagent degradation');
  const [escrowAmount, setEscrowAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleComputeSha256 = async () => {
    if (!protocolUrl.trim()) return;
    try {
      // Try fetching content to hash exact bytes; fallback to hashing URL string
      try {
        const res = await fetch(protocolUrl.trim());
        if (res.ok) {
          const text = await res.text();
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          setProtocolSpecHash(`sha256:${hashHex}`);
          return;
        }
      } catch {
        // Fallback to hashing URL string
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(protocolUrl.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      setProtocolSpecHash(`sha256:${hashHex}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskId.trim() || !assayName.trim() || !protocolUrl.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!protocolUrl.startsWith('http') && !protocolUrl.startsWith('ipfs://')) {
      setError('Protocol specification must be a valid HTTP/HTTPS or IPFS URL');
      return;
    }

    const cleanHash = protocolSpecHash.trim();
    if (!cleanHash) {
      setError('Mandatory Evidence Anchoring: Immutable protocol specification hash commitment (SHA-256 or IPFS CID) is strictly required.');
      return;
    }

    if (cleanHash.startsWith('ipfs://') || cleanHash.startsWith('Qm') || cleanHash.startsWith('bafy')) {
      const cid = cleanHash.replace('ipfs://', '').trim();
      const isCidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid);
      const isCidV1 = /^baf[a-z2-7]{45,65}$/.test(cid.toLowerCase());
      if (!isCidV0 && !isCidV1) {
        setError('Invalid IPFS CID format. Must be a valid CIDv0 (Qm... 46 chars) or CIDv1 (bafy...).');
        return;
      }
      if (!protocolUrl.startsWith(`ipfs://${cid}`) && !protocolUrl.includes(`/ipfs/${cid}`)) {
        setError(`URL binding violation: Protocol URL must bind to the committed IPFS CID (${cid}).`);
        return;
      }
    } else {
      const normHash = cleanHash.toLowerCase().replace('sha256:', '').trim();
      if (normHash.length !== 64 || !/^[0-9a-f]{64}$/.test(normHash)) {
        setError('Protocol spec hash must be a valid 64-character SHA-256 hexadecimal digest or IPFS CID.');
        return;
      }
    }

    const parsedAmount = parseGEN(escrowAmount);
    if (parsedAmount <= 0n) {
      setError('Escrow bounty must be greater than 0 GEN');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        taskId: taskId.trim(),
        assayName: assayName.trim(),
        protocolUrl: protocolUrl.trim(),
        protocolSpecHash: cleanHash,
        toleranceCriteria: toleranceCriteria.trim(),
        blacklistAnomalies: blacklistAnomalies.trim(),
        escrowAmount: parsedAmount,
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
      <div className="bg-bio-card border border-bio-emerald/40 rounded-xl max-w-xl w-full p-6 shadow-glow-emerald hud-border font-mono relative max-h-[90vh] overflow-y-auto">
        
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
              Baseline Protocol Spec URL (HTTP/HTTPS or IPFS)
            </label>
            <input
              type="text"
              value={protocolUrl}
              onChange={(e) => setProtocolUrl(e.target.value)}
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-2 text-bio-cyan focus:border-bio-cyan focus:outline-none"
              required
            />
          </div>

          {/* Evidence Integrity Commitment */}
          <div className="p-3 bg-bio-dark/70 border border-bio-cyan/40 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-bio-cyan">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold uppercase text-[11px]">Evidence Integrity: Immutable Hash Commitment</span>
                <span className="px-1.5 py-0.2 rounded bg-bio-crimson/20 border border-bio-crimson/40 text-bio-crimson text-[9px] font-bold">REQUIRED</span>
              </div>
              <button
                type="button"
                onClick={handleComputeSha256}
                className="text-[10px] px-2 py-0.5 rounded bg-bio-cyan/20 border border-bio-cyan/40 text-bio-cyan hover:bg-bio-cyan hover:text-bio-dark transition flex items-center space-x-1"
                title="Compute SHA-256 hash of protocol URL"
              >
                <Hash className="w-3 h-3" />
                <span>Compute SHA-256</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Commit an immutable content digest (SHA-256 or IPFS CID) so GenLayer validators verify against tamper-proof snapshot specifications.
            </p>
            <input
              type="text"
              value={protocolSpecHash}
              onChange={(e) => setProtocolSpecHash(e.target.value)}
              placeholder="e.g. sha256:... or ipfs://bafy..."
              className="w-full bg-bio-dark border border-bio-border rounded px-3 py-1.5 text-slate-200 text-[11px] focus:border-bio-cyan focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              Statistical Tolerance Criteria
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
