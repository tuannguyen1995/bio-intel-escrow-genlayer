# BioIntelEscrow (Decentralized Open-Science Protocol & Biomolecular Assay Replication Escrow)

BioIntelEscrow is a decentralized open-science protocol and biomolecular assay replication escrow platform built on GenLayer. It enables research sponsors and DAOs to post bounties for independent replication laboratories to validate biomolecular experimental protocols (such as CRISPR Cas12a cleavage kinetics, recombinant protein yields, or RT-qPCR assay sensitivity).

## Live App
- **Live Vercel Application**: [https://bio-intel-escrow-genlayer.vercel.app](https://bio-intel-escrow-genlayer.vercel.app)

## Deployed Contract
- **Contract Address (Studionet)**: `0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85`
- **GenLayer Block Explorer**: [https://genlayer-explorer.vercel.app/address/0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85](https://genlayer-explorer.vercel.app/address/0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85)

---

## 🧬 Architectural Highlights

### 1. Multi-Agent AI VM Consensus
- **Anti-Rugpull Guard**: Renders baseline protocol specifications live from HTTP/HTTPS endpoints via `gl.nondet.web.render`. Protects replication laboratories against missing or corrupt protocol specs.
- **Anti-Spam Guard**: Validates submitted raw lab telemetry log URLs before executing LLM evaluations.
- **Deterministic Consensus Framework**: Evaluates kinetic linearity ($R^2 > 0.98$), p-value thresholds ($p < 0.01$), coefficient of variation ($CV < 5\%$), and negative control integrity.

### 2. Mandatory 20% Lab Staking & Slashing
- Replication laboratories must deposit a minimum **20% stake** relative to the bounty escrow to accept an assay task.
- **Slashing Mechanism**: Two consecutive failed replication attempts result in task closure, returning 100% of the sponsor escrow bounty **plus the slashed lab stake** to the sponsor DAO.

### 3. 24-Hour Dispute Cooling-Off Window
- Payout finalization is locked for **86,400 seconds (24 hours)** post-`APPROVED` or `PARTIAL` verdict.
- Sponsors or laboratories can invoke `raise_dispute()` during this window to freeze funds and request human arbitration (`RELEASE`, `REFUND`, or `SPLIT`).

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
│   │   │   └── escrow.ts            # TypeScript interfaces & status definitions
│   │   ├── utils/
│   │   │   └── genlayer.ts          # genlayer-js on-chain integration
│   │   ├── App.tsx                  # Primary HUD application layout
│   │   ├── index.css                # Deep Bio-Dark theme & sci-fi glow styles
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── vercel.json
└── README.md
```

---

## ⚡ Verification & Deployment Guide

### 1. Smart Contract Unit Tests
Execute unit tests locally with Python:
```bash
python scripts/verify_contract.py
```

### 2. Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```

### 3. Deploy Smart Contract to GenLayer Studionet
```bash
genlayer deploy contracts/BioIntelEscrow.py --chain studionet
```

---

## 📜 License

MIT License. Built for GenLayer DeSci Hackathons.
