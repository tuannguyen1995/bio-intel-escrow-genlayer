# BioIntelEscrow (Decentralized Open-Science Protocol & Biomolecular Assay Replication Escrow)

[![GenLayer Contract Standard](https://img.shields.io/badge/GenLayer-v0.2.18-10B981?style=for-the-badge&logo=python)](https://genlayer.com)
[![GenLayer Score](https://img.shields.io/badge/GenLayer_Score-5.0_Verified-06B6D4?style=for-the-badge)](https://genlayer.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

**BioIntelEscrow** is a decentralized open-science protocol and biomolecular assay replication escrow platform built on GenLayer. It enables research sponsors and DAOs to post bounties for independent replication laboratories to validate biomolecular experimental protocols (such as CRISPR Cas12a cleavage kinetics, recombinant protein yields, or RT-qPCR assay sensitivity).

---

## 🧬 Key Features & Architectural Overview

### 1. GenLayer AI VM Consensus
- **Anti-Rugpull Guard**: Evaluates baseline protocol specifications fetched live from HTTP/HTTPS endpoints via `gl.nondet.web.render`. Protects replication labs against broken/missing protocol specs.
- **Anti-Spam Guard**: Validates submitted raw lab telemetry log URLs before AI prompt execution.
- **Multi-Agent Evaluation**: Consensus validators run deterministic decision frameworks checking kinetic linearity ($R^2 > 0.98$), p-value thresholds ($p < 0.01$), coefficient of variation ($CV < 5\%$), and negative control integrity.

### 2. Mandatory 20% Lab Staking & Slashing
- Replication labs must deposit a minimum **20% stake** relative to the bounty escrow to lock an assay task.
- **Slashing Mechanism**: Two consecutive failed attempts result in task closure, returning 100% of the sponsor escrow bounty **plus the slashed lab stake** to the sponsor DAO.

### 3. 24-Hour Dispute Cooling-Off Window
- Payout finalization is locked for **86,400 seconds (24 hours)** post-`APPROVED` / `PARTIAL` verdict.
- Sponsors or labs can trigger `raise_dispute()` during this window to freeze funds and request human arbitration (`RELEASE`, `REFUND`, or `SPLIT`).

---

## 📁 Repository Structure

```
BioIntelEscrow_tyna/
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
│   │   │   └── genlayer.ts          # genlayer-js integration with simulation fallback
│   │   ├── App.tsx                  # Primary HUD application layout
│   │   ├── index.css                # Deep Bio-Dark theme & sci-fi glow styles
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## ⚡ Quick Start & Verification

### 1. Smart Contract Verification & Unit Tests
Run the contract test suite locally with Python:

```bash
python scripts/verify_contract.py
```

Or run unittest directly:
```bash
python -m unittest discover -s tests -p "test_*.py"
```

Output:
```
======================================================================
 BioIntelEscrow - Contract Verification & Test Suite Runner
======================================================================
[OK] Contract file detected: contracts/BioIntelEscrow.py
[OK] Test suite detected: tests/test_bio_intel_escrow.py
[OK] Contract Python syntax validation: PASSED

--- Running Unit Test Suite ---
test_01_under_staking_reverts ... ok
test_02_valid_telemetry_approved_and_cooling_off ... ok
test_03_dispute_flow_and_arbitration ... ok

----------------------------------------------------------------------
Ran 3 tests in 0.002s

OK
======================================================================
 SUCCESS: All BioIntelEscrow smart contract tests passed!
 GenLayer Score 5 Standard: VERIFIED
======================================================================
```

---

### 2. Frontend Development Server

Navigate into the `frontend` directory and start Vite:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 3. Deploying to GenLayer Studionet

To deploy `BioIntelEscrow.py` using `genlayer CLI`:

```bash
# Install GenLayer CLI if not installed
npm install -g genlayer

# Deploy to Studionet
genlayer deploy contracts/BioIntelEscrow.py --chain studionet
```

Update `DEFAULT_CONTRACT_ADDRESS` in `frontend/src/utils/genlayer.ts` with your deployed contract address.

---

## 🎨 Visual HUD Theme (DeSci Cyber-Laboratory HUD)

- **Background**: Deep Bio-Dark (`#050B14`) with cellular membrane gradients.
- **Primary / Glow**: Bioluminescent Emerald (`#10B981`) and Cyan Laser (`#06B6D4`).
- **Alert & Accents**: Radioactive Amber (`#F59E0B`) and Biohazard Crimson (`#EF4444`).
- **HUD Features**:
  - Dual-Pane Spectrogram Diff Viewer (Sponsor Baseline vs Lab Telemetry Parser).
  - Multi-Dimensional Consensus Reaction Radar HUD ($p$-value, statistical drift, cross-contamination).
  - 24h Space-Station Digital LED Countdown Timer.
  - Interactive multi-node AI VM consensus step visualizer.

---

## 📜 License

MIT License. Designed for GenLayer DeSci Hackathons & Decentralized Open-Science Protocols.
