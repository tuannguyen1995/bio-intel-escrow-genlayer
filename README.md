# BioIntelEscrow (Decentralized Open-Science Protocol & Biomolecular Assay Replication Escrow)

[![Live Demo](https://img.shields.io/badge/Vercel_Live_App-BioIntelEscrow-000000?style=for-the-badge&logo=vercel)](https://bio-intel-escrow-genlayer.vercel.app)
[![GenLayer Contract Standard](https://img.shields.io/badge/GenLayer-v0.2.18-10B981?style=for-the-badge&logo=python)](https://genlayer.com)
[![GenLayer Score](https://img.shields.io/badge/GenLayer_Score-5.0_Verified-06B6D4?style=for-the-badge)](https://genlayer.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

**BioIntelEscrow** is a decentralized open-science (DeSci) and biomolecular assay replication escrow platform built on GenLayer. It enables research sponsors and DAOs to post bounties for independent replication laboratories to validate biomolecular experimental protocols (such as CRISPR Cas12a cleavage kinetics, recombinant protein yields, or RT-qPCR assay sensitivity).

🔗 **Live Vercel Application**: [https://bio-intel-escrow-genlayer.vercel.app](https://bio-intel-escrow-genlayer.vercel.app)  
🐙 **GitHub Repository**: [https://github.com/tuannguyen1995/bio-intel-escrow-genlayer](https://github.com/tuannguyen1995/bio-intel-escrow-genlayer)  
📝 **Deployed Contract (Studionet)**: [`0x7fa9f16047c5dcd78a6C0618F9a4e562DdAff81d`](https://genlayer-explorer.vercel.app/address/0x7fa9f16047c5dcd78a6C0618F9a4e562DdAff81d)

---

## 🧬 Architectural Highlights

### 1. Multi-Agent AI VM Consensus Board
- **Anti-Rugpull Guard**: Automatically renders the baseline protocol specification from the sponsor's HTTP/HTTPS endpoint using `gl.nondet.web.render` to protect the replication lab against broken or 404 specifications.
- **Multi-Agent Peer-Review**: Evaluates telemetry using three independent scientific LLM agent personas (Statistician, Biochemist, Contamination Guard) on-chain. Consensus requires a majority (at least 2 out of 3 votes).
- **ZK-Telemetry Mode**: Allows laboratories to upload a cryptographic hash of their telemetry (`zk_proof_hash`) to verify statistical compliance without exposing raw genomic sequences or proprietary chemical formulas on-chain.

### 2. Mandatory 20% Lab Staking & Slashing
- Independent replication labs must deposit a minimum **20% stake** relative to the escrow bounty to lock a task.
- **Slashing Mechanism**: Two consecutive failed validation attempts (verdict: REFUND) close the task, transferring 100% of the sponsor escrow bounty and the slashed lab stake to the sponsor DAO.

### 3. 24-Hour Dispute Window, Appeal Bonds & AI Referee
- Once consensus outputs an `APPROVED` or `PARTIAL` verdict, funds enter a **24-hour cooling-off window**.
- **10% Appeal Bond Staking**: Raising a dispute requires staking a **10% Appeal Bond** in GEN to prevent spam disputes.
- **AI Referee Arbitration**: Disputed tasks are adjudicated on-chain by an automated AI Referee (`resolve_dispute_via_referee`). If the dispute is valid, the sponsor gets refunded and the lab's stake is slashed. If invalid, the lab receives the bounty, lab stake, and slashed sponsor appeal bond.


---

## 📁 Repository Structure

```
BioIntelEscrow/
├── contracts/
│   └── BioIntelEscrow.py            # Intelligent GenLayer smart contract in Python
├── tests/
│   └── test_bio_intel_escrow.py     # GenLayer VM runtime mock unit test suite
├── scripts/
│   └── verify_contract.py           # Contract verification & test runner script
├── frontend/                        # DeSci Cyber-Laboratory HUD UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # HUD Header & Role Switcher
│   │   │   ├── StatsOverview.tsx    # TVL, active experiments & AI metrics cards
│   │   │   ├── SpectrogramDiffViewer.tsx # Dual-pane spectrogram & kinetic curve diff chart
│   │   │   ├── ConsensusReactionHUD.tsx  # Radar metric breakdown & AI confidence HUD
│   │   │   ├── CountdownClock.tsx   # LED countdown timer for dispute cooling-off
│   │   │   ├── TaskCard.tsx         # Assay task status & action card
│   │   │   ├── CreateTaskModal.tsx  # Sponsor bounty creation form
│   │   │   ├── AcceptTaskModal.tsx  # Lab 20% stake cashing form
│   │   │   ├── SubmitTelemetryModal.tsx # Lab telemetry log submission form
│   │   │   ├── RaiseDisputeModal.tsx# Dispute filing form
│   │   │   ├── ResolveEscalationModal.tsx # Admin arbitration settlement panel
│   │   │   └── AIConsensusModal.tsx # Multi-node AI consensus workflow visualizer
│   │   ├── types/
│   │   │   └── escrow.ts
│   │   ├── utils/
│   │   │   └── genlayer.ts          # genlayer-js Web3 integration utility
│   │   ├── App.tsx
│   │   ├── index.css                # Deep Bio-Dark theme styling & glow effects
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── vercel.json
└── README.md
```

---

## ⚡ Verification & Deployment Guide

### 1. Validate Smart Contract
Run the local mock test suite:
```bash
python scripts/verify_contract.py
```

### 2. Start Frontend Dev Server Locally
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Deploy Smart Contract to GenLayer Studionet
```bash
genlayer deploy contracts/BioIntelEscrow.py --chain studionet
```

---

## 📜 License

MIT License. Designed for GenLayer DeSci Hackathons.
