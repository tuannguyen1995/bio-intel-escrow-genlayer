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
import { AssayTask, UserRole, TaskStatus } from './types/escrow';
import {
  fetchAllAssayTasks,
  createAssayTaskOnChain,
  acceptAssayTaskOnChain,
  submitAssayTelemetryOnChain,
  raiseDisputeOnChain,
  finalizePayoutOnChain,
  resolveEscalationOnChain,
} from './utils/genlayer';
import { Dna, RefreshCw, Layers, ShieldCheck, Filter } from 'lucide-react';

export function App() {
  const [tasks, setTasks] = useState<AssayTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AssayTask | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('SPONSOR');
  const [walletAddress, setWalletAddress] = useState<string>('0xsponsor_desci_dao_88a1');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [activeTaskForModal, setActiveTaskForModal] = useState<AssayTask | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAssayTasks();
      setTasks(data);
      if (data.length > 0 && !selectedTask) {
        setSelectedTask(data[0]);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Sync default mock wallet address based on role for easy testing
  useEffect(() => {
    if (currentRole === 'SPONSOR') {
      setWalletAddress('0xsponsor_desci_dao_88a1');
    } else if (currentRole === 'LAB') {
      setWalletAddress('0xreplication_lab_biotech_77c2');
    } else if (currentRole === 'ADMIN') {
      setWalletAddress('0xadmin_platform_governance');
    }
  }, [currentRole]);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (err) {
        console.warn("Wallet connection error:", err);
      }
    } else {
      setIsConnected(!isConnected);
    }
  };

  // Handlers for modal submissions
  const handleCreateTask = async (params: any) => {
    await createAssayTaskOnChain({
      ...params,
      userAddress: walletAddress,
    });
    await loadData();
  };

  const handleAcceptTask = async (taskId: string, stakeAmount: bigint) => {
    await acceptAssayTaskOnChain({
      taskId,
      stakeAmount,
      userAddress: walletAddress,
    });
    await loadData();
  };

  const handleSubmitTelemetry = async (params: any) => {
    await submitAssayTelemetryOnChain({
      ...params,
      userAddress: walletAddress,
    });
    await loadData();
  };

  const handleRaiseDispute = async (taskId: string, reason: string) => {
    await raiseDisputeOnChain({
      taskId,
      reason,
      userAddress: walletAddress,
    });
    await loadData();
  };

  const handleFinalizePayout = async (taskId: string) => {
    await finalizePayoutOnChain({
      taskId,
      userAddress: walletAddress,
    });
    await loadData();
  };

  const handleResolveEscalation = async (taskId: string, action: 'RELEASE' | 'REFUND' | 'SPLIT') => {
    await resolveEscalationOnChain({
      taskId,
      action,
      userAddress: walletAddress,
    });
    await loadData();
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
        isConnected={isConnected}
        onCreateBountyClick={() => setIsCreateModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
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
          <div className="bg-bio-card border border-bio-border p-8 rounded-xl text-center font-mono text-slate-400 mb-6">
            <Dna className="w-10 h-10 mx-auto mb-2 text-bio-cyan animate-pulse" />
            <p>Select an assay bounty task below to view interactive spectrogram HUD telemetry.</p>
          </div>
        )}

        {/* Task List Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-bio-border pb-3 mb-6 gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-bio-emerald" />
            <h2 className="font-mono font-bold text-base uppercase tracking-wider text-slate-100">
              Biomolecular Replication Bounties
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-bio-dark border border-bio-border text-slate-400">
              {filteredTasks.length} Tasks
            </span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
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
              className="p-1 rounded bg-bio-dark border border-bio-border text-slate-400 hover:text-bio-emerald ml-1"
              title="Refresh Tasks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Task Grid */}
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

      </main>

      {/* Footer */}
      <footer className="border-t border-bio-border bg-bio-card/60 py-6 font-mono text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-bio-emerald animate-pulse"></span>
            <span>GenLayer Studionet Contract • Intelligent Escrow v0.2.18</span>
          </div>
          <div>
            BioIntelEscrow DeSci Protocol © 2026 • Biomolecular Assay Replication
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
        onTriggerConsensusAnimation={(t, url) => {
          setActiveTaskForModal(t);
          setIsConsensusModalOpen(true);
        }}
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
