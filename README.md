# BioIntelEscrow (Decentralized Open-Science Protocol & Biomolecular Assay Replication Escrow)

[![Live Demo](https://img.shields.io/badge/Vercel_Live_App-BioIntelEscrow-000000?style=for-the-badge&logo=vercel)](https://bio-intel-escrow-genlayer.vercel.app)
[![GenLayer Contract Standard](https://img.shields.io/badge/GenLayer-v0.2.18-10B981?style=for-the-badge&logo=python)](https://genlayer.com)
[![GenLayer Score](https://img.shields.io/badge/GenLayer_Score-5.0_Verified-06B6D4?style=for-the-badge)](https://genlayer.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

BioIntelEscrow is a decentralized open-science protocol built on GenLayer that enables research DAOs to post bounties for independent lab replication, leveraging GenLayer's AI Consensus to validate raw spectrophotometry telemetry against baseline scientific protocols.

## Live App
[https://bio-intel-escrow-genlayer.vercel.app](https://bio-intel-escrow-genlayer.vercel.app)

## Deployed Contract
- **Contract Address**: `0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85`
- **GenLayer Explorer**: [https://genlayer-explorer.vercel.app/address/0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85](https://genlayer-explorer.vercel.app/address/0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85)

---

## 🧬 Architectural Highlights

### 1. Multi-Agent AI VM Consensus
- **Anti-Rugpull Guard**: Renders baseline protocol specifications live from HTTP/HTTPS endpoints via `gl.nondet.web.render`. Protects replication labs against broken or missing protocol specifications.
- **Anti-Spam Guard**: Validates submitted raw lab telemetry log URLs before executing LLM prompt evaluation.
- **Deterministic Consensus Framework**: Compares kinetic curve linearity ($R^2 > 0.98$), p-value thresholds ($p < 0.01$), coefficient of variation ($CV < 5\%$), and negative control integrity.

### 2. Mandatory 20% Lab Staking & Slashing
- Independent replication labs must deposit a minimum **20% stake** relative to the escrow bounty to lock an assay task.
- **Slashing Mechanism**: Two consecutive failed attempts result in task closure, returning 100% of the escrow bounty **plus the slashed lab stake** to the sponsor DAO.

### 3. 24-Hour Dispute Cooling-Off Window
- Post-`APPROVED` or `PARTIAL` verdict, funds are locked for **86,400 seconds (24 hours)**.
- During this window, sponsors or labs can trigger `raise_dispute()` to freeze payouts and request governance arbitration (`RELEASE`, `REFUND`, `SPLIT`).

---

## 📁 Repository Structure

```
bio-intel-escrow-genlayer/
├── contracts/
│   └── BioIntelEscrow.py            # Intelligent GenLayer smart contract in Python
├── tests/
│   └── test_bio_intel_escrow.py     # Python unit test suite mocking GenLayer VM runtime
├── scripts/
│   └── verify_contract.py           # Verification script & test runner
├── frontend/                        # DeSci Cyber-Laboratory HUD UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # DeSci HUD header & role switcher
│   │   │   ├── StatsOverview.tsx    # TVL, active experiments & AI accuracy cards
│   │   │   ├── SpectrogramDiffViewer.tsx # Dual-pane Spectrogram & Kinetic curve parser
│   │   │   ├── ConsensusReactionHUD.tsx  # Radar metric breakdown & confidence score
│   │   │   ├── CountdownClock.tsx   # 24h Space-Station LED countdown clock
│   │   │   ├── TaskCard.tsx         # Assay bounty task card with status badges
│   │   │   ├── CreateTaskModal.tsx  # Sponsor modal to post bounties
│   │   │   ├── AcceptTaskModal.tsx  # Lab modal for 20% stake deposit
│   │   │   ├── SubmitTelemetryModal.tsx # Lab modal to submit telemetry CSV/logs
│   │   │   ├── RaiseDisputeModal.tsx# Dispute modal during 24h cooling-off
│   │   │   ├── ResolveEscalationModal.tsx # Admin/Sponsor arbitration modal
│   │   │   └── AIConsensusModal.tsx # Step-by-step AI VM execution animation
│   │   ├── types/
│   │   │   └── escrow.ts
│   │   ├── utils/
│   │   │   └── genlayer.ts          # Pure on-chain genlayer-js integration
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── vercel.json
└── README.md
```

---

## ⚡ Verification & Deployment Guide

### 1. Smart Contract Verification & Unit Tests
Run the contract test suite locally with Python:

```bash
python scripts/verify_contract.py
```

### 2. Frontend Local Development
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📜 License

MIT License. Designed for GenLayer DeSci Open-Science Protocols.
