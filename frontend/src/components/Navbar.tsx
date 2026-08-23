import React from 'react';
import { Dna, ShieldCheck, Wallet, Cpu, Activity, User } from 'lucide-react';
import { UserRole } from '../types/escrow';

interface NavbarProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  walletAddress: string;
  connectWallet: () => void;
  isConnected: boolean;
  onCreateBountyClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  walletAddress,
  connectWallet,
  isConnected,
  onCreateBountyClick,
}) => {
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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bio-cyan/10 border border-bio-cyan/40 text-bio-cyan uppercase">
                GenLayer HUD
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Decentralized Biomolecular Assay Replication & AI Consensus Escrow
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

        {/* Actions & Wallet */}
        <div className="flex items-center space-x-3">
          {currentRole === 'SPONSOR' && (
            <button
              onClick={onCreateBountyClick}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-bio-emerald to-bio-cyan text-bio-dark font-mono font-bold text-xs hover:opacity-90 transition shadow-glow-emerald flex items-center space-x-1.5"
            >
              <span>+ Create Assay Bounty</span>
            </button>
          )}

          {/* Network Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-bio-dark border border-bio-border font-mono text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-bio-emerald animate-pulse" />
            <span>Studionet</span>
          </div>

          {/* Wallet Button */}
          <button
            onClick={connectWallet}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-bio-dark border border-bio-emerald/40 hover:border-bio-emerald font-mono text-xs text-slate-200 transition"
          >
            <Wallet className="w-3.5 h-3.5 text-bio-cyan" />
            <span>
              {isConnected
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : 'Connect Wallet'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
