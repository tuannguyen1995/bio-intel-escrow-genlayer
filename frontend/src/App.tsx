import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { SpectrogramDiffViewer } from './components/SpectrogramDiffViewer';
import { ConsensusReactionHUD } from './components/ConsensusReactionHUD';
import { CountdownClock } from './components/CountdownClock';
import { TaskCard } from './components/TaskCard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AcceptTaskModal } from './components/AcceptTaskModal';
import { SubmitTelemetryModal } from './components/SubmitTelemetryModal';
import { RaiseDisputeModal } from './components/RaiseDisputeModal';
import { ResolveEscalationModal } from './components/ResolveEscalationModal';
import { AIConsensusModal } from './components/AIConsensusModal';
import { AssayTask, UserRole } from './types/escrow';
import {
  DEFAULT_CONTRACT_ADDRESS,
  fetchAllAssayTasks,
  createAssayTaskOnChain,
  acceptAssayTaskOnChain,
  submitAssayTelemetryOnChain,
  raiseDisputeOnChain,
  finalizePayoutOnChain,
  resolveEscalationOnChain,
} from './utils/genlayer';
import { Dna, RefreshCw, Layers, Wallet, AlertCircle, PlusCircle } from 'lucide-react';

export function App() {
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [tasks, setTasks] = useState<AssayTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AssayTask | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('SPONSOR');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [activeTaskForModal, setActiveTaskForModal] = useState<AssayTask | null>(null);

  const connectWallet = async () => {
    setErrorMessage('');
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0].toLowerCase());
          setIsConnected(true);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to connect Web3 wallet");
      }
    } else {
      setErrorMessage("No Web3 wallet extension found. Please install MetaMask.");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0].toLowerCase());
            setIsConnected(true);
          }
        })
        .catch(() => {});

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].toLowerCase());
          setIsConnected(true);
        } else {
          disconnectWallet();
        }
      };

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        if ((window as any).ethereum?.removeListener) {
          (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchAllAssayTasks(contractAddress);
      setTasks(data);
      if (data.length > 0) {
        if (!selectedTask || !data.some(t => t.id === selectedTask.id)) {
          setSelectedTask(data[0]);
        }
      } else {
        setSelectedTask(null);
      }
    } catch (err: any) {
      console.warn("Failed to load on-chain tasks:", err);
      setErrorMessage(err.message || "Failed to load tasks from GenLayer contract");
      setTasks([]);
      setSelectedTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractAddress) {
      loadData();
    }
  }, [contractAddress]);

  // Update selectedTask when tasks change
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) {
        setSelectedTask(updated);
      }
    } else if (tasks.length > 0) {
      setSelectedTask(tasks[0]);
    }
  }, [tasks]);

  // Handlers for on-chain modal submissions
  const handleCreateTask = async (params: any) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await createAssayTaskOnChain({
        ...params,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain bounty creation failed");
      throw err;
    }
  };

  const handleAcceptTask = async (taskId: string, stakeAmount: bigint) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await acceptAssayTaskOnChain({
        taskId,
        stakeAmount,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain lab staking failed");
      throw err;
    }
  };

  const handleSubmitTelemetry = async (params: any) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await submitAssayTelemetryOnChain({
        ...params,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain telemetry submission failed");
      throw err;
    }
  };

  const handleRaiseDispute = async (taskId: string, reason: string) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await raiseDisputeOnChain({
        taskId,
        reason,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain dispute failed");
      throw err;
    }
  };

  const handleFinalizePayout = async (taskId: string) => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await finalizePayoutOnChain({
        taskId,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain payout finalization failed");
    }
  };

  const handleResolveEscalation = async (taskId: string, action: 'RELEASE' | 'REFUND' | 'SPLIT') => {
    if (!walletAddress) {
      await connectWallet();
    }
    setErrorMessage('');
    try {
      await resolveEscalationOnChain({
        taskId,
        action,
        userAddress: walletAddress,
        contractAddress,
      });
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "On-chain arbitration failed");
      throw err;
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-bio-dark text-slate-100 selection:bg-bio-emerald selection:text-bio-dark">
      
      {/* HUD Header Bar */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        walletAddress={walletAddress}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        isConnected={isConnected}
        contractAddress={contractAddress}
        setContractAddress={setContractAddress}
        onCreateBountyClick={() => setIsCreateModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* On-Chain Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-bio-crimson/10 border border-bio-crimson/50 rounded-xl text-bio-crimson font-mono text-xs flex items-center justify-between shadow-glow-crimson">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Key Metrics Overview */}
        <StatsOverview tasks={tasks} />

        {/* Primary Interactive HUD View (for selected task) */}
        {selectedTask ? (
          <div>
            
            {/* 24h Countdown Clock if awaiting payout */}
            {selectedTask.status === 'AWAITING_PAYOUT' && (
              <CountdownClock
                task={selectedTask}
                currentRole={currentRole}
                userAddress={walletAddress}
                onRaiseDisputeClick={() => {
                  setActiveTaskForModal(selectedTask);
                  setIsDisputeModalOpen(true);
                }}
                onFinalizePayoutClick={() => handleFinalizePayout(selectedTask.id)}
              />
            )}

            {/* Spectrogram & Diff Viewer Dual-Pane */}
            <SpectrogramDiffViewer task={selectedTask} />

            {/* Consensus Reaction HUD & AI Metrics */}
            <ConsensusReactionHUD
              task={selectedTask}
              onRunConsensusClick={() => {
                setActiveTaskForModal(selectedTask);
                setIsConsensusModalOpen(true);
              }}
            />

          </div>
        ) : (
          <div className="bg-bio-card border border-bio-border p-8 rounded-xl text-center font-mono text-slate-400 mb-6 hud-border">
            <Dna className="w-10 h-10 mx-auto mb-3 text-bio-emerald animate-pulse" />
            <h3 className="text-base font-bold text-slate-200 uppercase mb-1">
              GenLayer On-Chain Assay Escrow HUD
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              {isConnected
                ? "No active assay bounties found on contract. Create a new bounty below or switch contract address."
                : "Connect your Web3 wallet (MetaMask) on GenLayer Studionet to create or inspect live on-chain assay bounties."}
            </p>
            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="px-4 py-2 rounded-lg bg-bio-emerald text-bio-dark font-bold text-xs hover:opacity-90 transition shadow-glow-emerald inline-flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-bio-emerald text-bio-dark font-bold text-xs hover:opacity-90 transition shadow-glow-emerald inline-flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create Assay Bounty</span>
              </button>
            )}
          </div>
        )}

        {/* Task List Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-bio-border pb-3 mb-6 gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-bio-emerald" />
            <h2 className="font-mono font-bold text-base uppercase tracking-wider text-slate-100">
              Live On-Chain Replication Tasks
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-bio-dark border border-bio-border text-slate-400">
              {filteredTasks.length} On-Chain Tasks
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'AWAITING_PAYOUT', 'DISPUTED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded transition text-[11px] ${
                  statusFilter === st
                    ? 'bg-bio-emerald/20 text-bio-emerald border border-bio-emerald/50 font-bold'
                    : 'bg-bio-dark text-slate-400 border border-bio-border hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1 rounded bg-bio-dark border border-bio-border text-slate-400 hover:text-bio-emerald ml-1"
              title="Refresh On-Chain State"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-bio-emerald' : ''}`} />
            </button>
          </div>
        </div>

        {/* Task Grid */}
        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                currentRole={currentRole}
                userAddress={walletAddress}
                onSelectTask={(t) => setSelectedTask(t)}
                onAcceptClick={(t) => {
                  setActiveTaskForModal(t);
                  setIsAcceptModalOpen(true);
                }}
                onSubmitTelemetryClick={(t) => {
                  setActiveTaskForModal(t);
                  setIsSubmitModalOpen(true);
                }}
                onRaiseDisputeClick={(t) => {
                  setActiveTaskForModal(t);
                  setIsDisputeModalOpen(true);
                }}
                onFinalizePayoutClick={(t) => handleFinalizePayout(t.id)}
                onResolveEscalationClick={(t) => {
                  setActiveTaskForModal(t);
                  setIsResolveModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center font-mono text-slate-500 py-10 text-xs">
            No on-chain tasks matching filter criteria.
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-bio-border bg-bio-card/60 py-6 font-mono text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-bio-emerald animate-pulse"></span>
            <span>GenLayer Studionet Contract: <code className="text-bio-cyan">{contractAddress.slice(0, 10)}...</code></span>
          </div>
          <div>
            BioIntelEscrow Protocol © 2026 • Pure On-Chain Integration
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      <AcceptTaskModal
        task={activeTaskForModal}
        isOpen={isAcceptModalOpen}
        onClose={() => setIsAcceptModalOpen(false)}
        onSubmit={handleAcceptTask}
      />

      <SubmitTelemetryModal
        task={activeTaskForModal}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitTelemetry}
      />

      <RaiseDisputeModal
        task={activeTaskForModal}
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        onSubmit={handleRaiseDispute}
      />

      <ResolveEscalationModal
        task={activeTaskForModal}
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        onSubmit={handleResolveEscalation}
      />

      <AIConsensusModal
        isOpen={isConsensusModalOpen}
        onClose={() => setIsConsensusModalOpen(false)}
        task={activeTaskForModal}
      />

    </div>
  );
}
