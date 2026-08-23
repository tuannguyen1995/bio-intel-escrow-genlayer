import React, { useState } from 'react';
import { Dna, Wallet, LogOut, Activity, User, Settings, Check, Copy } from 'lucide-react';
import { UserRole } from '../types/escrow';

interface NavbarProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  walletAddress: string;
  connectWallet: () => void;
  disconnectWallet: () => void;
  isConnected: boolean;
  contractAddress: string;
  setContractAddress: (addr: string) => void;
  onCreateBountyClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  walletAddress,
  connectWallet,
  disconnectWallet,
  isConnected,
  contractAddress,
  setContractAddress,
  onCreateBountyClick,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="border-b border-bio-border bg-bio-card/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-bio-emerald/10 border border-bio-emerald/40 text-bio-emerald shadow-glow-emerald animate-pulse-fast">
            <Dna className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-lg tracking-wider text-slate-100 uppercase">
                BioIntel<span className="text-bio-emerald">Escrow</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bio-cyan/10 border border-bio-cyan/40 text-bio-cyan uppercase font-bold">
                GenLayer Studionet On-Chain
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Decentralized Biomolecular Assay Replication Protocol
            </p>
          </div>
        </div>

        {/* Center Controls: Role Switcher */}
        <div className="hidden md:flex items-center bg-bio-dark border border-bio-border rounded-lg p-1 space-x-1 font-mono text-xs">
          <span className="px-2 text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
            <User className="w-3 h-3" /> Role:
          </span>
          {(['SPONSOR', 'LAB', 'ADMIN'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setCurrentRole(r)}
              className={`px-3 py-1 rounded transition-all duration-200 ${
                currentRole === r
                  ? 'bg-bio-emerald/20 text-bio-emerald border border-bio-emerald/50 font-semibold shadow-glow-emerald'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Actions & Wallet Controls */}
        <div className="flex items-center space-x-2.5">
          {currentRole === 'SPONSOR' && (
            <button
              onClick={onCreateBountyClick}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-bio-emerald to-bio-cyan text-bio-dark font-mono font-bold text-xs hover:opacity-90 transition shadow-glow-emerald flex items-center space-x-1.5"
            >
              <span>+ Create Assay Bounty</span>
            </button>
          )}

          {/* Contract Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-bio-dark border border-bio-border text-slate-400 hover:text-bio-cyan transition"
            title="Contract Address Config"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Network Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-bio-dark border border-bio-border font-mono text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-bio-emerald animate-pulse" />
            <span>Studionet</span>
          </div>

          {/* Wallet Connect / Disconnect */}
          {isConnected && walletAddress ? (
            <div className="flex items-center space-x-1.5 font-mono text-xs">
              <button
                onClick={copyAddress}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bio-dark border border-bio-emerald/50 text-slate-200 hover:border-bio-emerald transition"
                title="Copy Address"
              >
                <span className="w-2 h-2 rounded-full bg-bio-emerald animate-pulse"></span>
                <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                {copied ? <Check className="w-3 h-3 text-bio-emerald" /> : <Copy className="w-3 h-3 text-slate-500" />}
              </button>

              <button
                onClick={disconnectWallet}
                className="p-1.5 rounded-lg bg-bio-dark border border-bio-crimson/40 text-bio-crimson hover:bg-bio-crimson hover:text-white transition"
                title="Disconnect Wallet"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-bio-emerald text-bio-dark font-mono font-bold text-xs hover:opacity-90 transition shadow-glow-emerald"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}

        </div>
      </div>

      {/* Contract Settings Dropdown / Panel */}
      {showSettings && (
        <div className="bg-bio-dark border-t border-bio-border py-2.5 px-4 font-mono text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-slate-400 text-[11px]">Deployed GenLayer Contract Address:</span>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="bg-bio-card border border-bio-border px-3 py-1 rounded text-bio-cyan font-bold w-full sm:w-96 text-xs focus:border-bio-cyan focus:outline-none"
              placeholder="0x..."
            />
          </div>
        </div>
      )}
    </header>
  );
};
