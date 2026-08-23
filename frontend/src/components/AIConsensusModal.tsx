import React, { useEffect, useState } from 'react';
import { Cpu, Globe, Sparkles, CheckCircle2, ShieldCheck, Flame, Loader2, X } from 'lucide-react';
import { AssayTask } from '../types/escrow';

interface AIConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AssayTask | null;
  assayLogUrl?: string;
}

export const AIConsensusModal: React.FC<AIConsensusModalProps> = ({
  isOpen,
  onClose,
  task,
  assayLogUrl,
}) => {
  if (!isOpen || !task) return null;

  const [step, setStep] = useState<number>(1);
  const [complete, setComplete] = useState<boolean>(false);

  useEffect(() => {
    setStep(1);
    setComplete(false);

    const timer1 = setTimeout(() => setStep(2), 900);
    const timer2 = setTimeout(() => setStep(3), 1800);
    const timer3 = setTimeout(() => setStep(4), 2700);
    const timer4 = setTimeout(() => {
      setStep(5);
      setComplete(true);
    }, 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [task, assayLogUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono">
      <div className="bg-bio-card border border-bio-emerald/60 rounded-xl max-w-xl w-full p-6 shadow-glow-emerald hud-border relative">
        
        <div className="flex items-center justify-between border-b border-bio-border pb-3 mb-4">
          <div className="flex items-center space-x-2 text-bio-emerald">
            <Cpu className="w-5 h-5 animate-pulse" />
            <h3 className="font-bold text-sm uppercase">GenVM Multi-Agent Consensus Validator</h3>
          </div>
          {complete && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress List */}
        <div className="space-y-3 text-xs mb-6">
          
          {/* Step 1: Render Baseline Protocol */}
          <div className={`p-3 rounded border transition-all flex items-center justify-between ${
            step >= 1 ? 'bg-bio-dark border-bio-emerald/40 text-slate-200' : 'opacity-40 bg-bio-dark/40 border-bio-border'
          }`}>
            <div className="flex items-center space-x-2.5">
              <Globe className={`w-4 h-4 ${step >= 1 ? 'text-bio-cyan' : 'text-slate-600'}`} />
              <div>
                <span className="font-bold block">1. Anti-Rugpull Guard</span>
                <span className="text-[10px] text-slate-400">gl.nondet.web.render(sponsor_protocol_url)</span>
              </div>
            </div>
            {step === 1 && <Loader2 className="w-4 h-4 text-bio-cyan animate-spin" />}
            {step > 1 && <CheckCircle2 className="w-4 h-4 text-bio-emerald" />}
          </div>

          {/* Step 2: Render Lab Telemetry */}
          <div className={`p-3 rounded border transition-all flex items-center justify-between ${
            step >= 2 ? 'bg-bio-dark border-bio-emerald/40 text-slate-200' : 'opacity-40 bg-bio-dark/40 border-bio-border'
          }`}>
            <div className="flex items-center space-x-2.5">
              <Globe className={`w-4 h-4 ${step >= 2 ? 'text-bio-cyan' : 'text-slate-600'}`} />
              <div>
                <span className="font-bold block">2. Anti-Spam Guard</span>
                <span className="text-[10px] text-slate-400">gl.nondet.web.render(lab_telemetry_csv)</span>
              </div>
            </div>
            {step === 2 && <Loader2 className="w-4 h-4 text-bio-cyan animate-spin" />}
            {step > 2 && <CheckCircle2 className="w-4 h-4 text-bio-emerald" />}
          </div>

          {/* Step 3: LLM Leader Prompt */}
          <div className={`p-3 rounded border transition-all flex items-center justify-between ${
            step >= 3 ? 'bg-bio-dark border-bio-emerald/40 text-slate-200' : 'opacity-40 bg-bio-dark/40 border-bio-border'
          }`}>
            <div className="flex items-center space-x-2.5">
              <Sparkles className={`w-4 h-4 ${step >= 3 ? 'text-bio-emerald' : 'text-slate-600'}`} />
              <div>
                <span className="font-bold block">3. Leader Node LLM Quantitative Evaluation</span>
                <span className="text-[10px] text-slate-400">gl.nondet.exec_prompt(DeSci_Replication_Framework)</span>
              </div>
            </div>
            {step === 3 && <Loader2 className="w-4 h-4 text-bio-emerald animate-spin" />}
            {step > 3 && <CheckCircle2 className="w-4 h-4 text-bio-emerald" />}
          </div>

          {/* Step 4: Validator Node Consensus Check */}
          <div className={`p-3 rounded border transition-all flex items-center justify-between ${
            step >= 4 ? 'bg-bio-dark border-bio-emerald/40 text-slate-200' : 'opacity-40 bg-bio-dark/40 border-bio-border'
          }`}>
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className={`w-4 h-4 ${step >= 4 ? 'text-bio-emerald' : 'text-slate-600'}`} />
              <div>
                <span className="font-bold block">4. GenVM Validator Node Consensus Match</span>
                <span className="text-[10px] text-slate-400">gl.vm.run_nondet(leader_fn, validator_fn)</span>
              </div>
            </div>
            {step === 4 && <Loader2 className="w-4 h-4 text-bio-emerald animate-spin" />}
            {step >= 5 && <CheckCircle2 className="w-4 h-4 text-bio-emerald" />}
          </div>

        </div>

        {/* Step 5: Final Result Display */}
        {complete && (
          <div className="bg-bio-dark border border-bio-emerald p-4 rounded-lg space-y-2 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-bio-border pb-2">
              <span className="text-xs font-bold text-bio-emerald uppercase">Consensus Verdict Reached</span>
              <span className="text-xs px-2 py-0.5 rounded bg-bio-emerald/20 border border-bio-emerald text-bio-emerald font-bold">
                {task.verdict || 'APPROVED'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Confidence Score:</span>
              <span className="text-slate-100 font-bold">{task.confidence || '98'}%</span>
            </div>
            <p className="text-xs text-slate-300 pt-1 leading-relaxed">
              {task.reason || "Quantitative parameters validated against baseline specs. Payout queued for 24h dispute window."}
            </p>
            <div className="pt-3 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded bg-bio-emerald text-bio-dark font-bold text-xs hover:opacity-90 shadow-glow-emerald"
              >
                Close Visualizer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
