# BioIntelEscrow (Decentralized Biomolecular Replication Evidence & Escrow Protocol)

[![Live Demo](https://img.shields.io/badge/Vercel_Live_App-BioIntelEscrow-000000?style=for-the-badge&logo=vercel)](https://bio-intel-escrow-genlayer.vercel.app)
[![GenLayer Contract Standard](https://img.shields.io/badge/GenLayer-v0.2.18-10B981?style=for-the-badge&logo=python)](https://genlayer.com)
[![GenLayer Score](https://img.shields.io/badge/GenLayer_Score-5.0_Verified-06B6D4?style=for-the-badge)](https://genlayer.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

**BioIntelEscrow** is a decentralized open-science (DeSci) escrow protocol built on GenLayer that decentralizes the **evaluation and financial settlement of biomolecular assay replication evidence**. It enables research sponsors and DAOs to post bounties for independent laboratories to reproduce critical experimental protocols (such as CRISPR Cas12a cleavage kinetics, recombinant protein yields, or RT-qPCR assay sensitivity) while ensuring mathematical and biochemical compliance.

🔗 **Live Vercel Application**: [https://bio-intel-escrow-genlayer.vercel.app](https://bio-intel-escrow-genlayer.vercel.app)  
🐙 **GitHub Repository**: [https://github.com/tuannguyen1995/bio-intel-escrow-genlayer](https://github.com/tuannguyen1995/bio-intel-escrow-genlayer)  
📝 **Canonical Deployed Contract (Studionet)**: [`0x687E99e2F0C9851E4c2822730D47c897Da62978e`](https://explorer-studio.genlayer.com/address/0x687E99e2F0C9851E4c2822730D47c897Da62978e)

---

## 🧬 Architectural Highlights

### 1. Evidence Integrity: Immutable Hash Commitments & Content-Addressed Snapshots
- **Immutable State Proofs**: To prevent mutable HTTP/HTTPS URL drift or post-submission tampering, both the baseline protocol (`protocol_spec_hash`) and the replication telemetry (`assay_log_hash`) require an immutable content hash (SHA-256 or IPFS CID) committed on-chain.
- **Validator Snapshot Comparison**: GenLayer validator nodes verify rendered content against the committed digest. If any hash mismatch or payload tampering is detected, consensus triggers `ESCALATE` with 100% confidence.

### 2. Laboratory Provenance & Hardware Instrument Attestation
- **Physical Provenance Tracking**: Rather than making unrealistic "trustless wet-lab execution" claims, the protocol authenticates physical provenance via:
  - **LIMS Export Audits**: Cryptographic digest of raw LIMS database runs.
  - **Hardware Instrument Attestations**: Spectrometer hardware serial IDs (e.g. `Biotek-Synergy-H1-SN48821`).
  - **Certified Laboratory Signatures**: ECDSA / Ed25519 signature from certified replication laboratories (`lab_provenance_sig`).
- **Multi-Agent Evaluation**: The on-chain Multi-Agent Board (Statistician, Biochemist, and Contamination Guard) verifies both quantitative kinetic curves and hardware provenance authenticity.

### 3. Safe Settlement Recovery: Pull-over-Push Withdrawable Credits Vault
- **Fault-Tolerant Settlement**: Solves the critical risk of locked funds or failed contract transfers during payout/refund settlement.
- **Withdrawable Credits Pattern**: Instead of unsafe push transfers (`emit_transfer`) that revert upon contract recipient failure, final payouts, dispute refunds, and bond slashings are securely credited to `withdrawable_balances`.
- **Self-Custodial Claims**: Beneficiaries claim their funds on-demand via the public `withdraw_credits()` method, guaranteed by an on-chain ledger.

### 4. Economic Security: Staking, Appeal Bonds & Automated AI Referee
- **20% Lab Staking & Slashing**: Laboratories must deposit 20% stake to accept bounties. Two failed validation attempts automatically forfeit the stake to the sponsor DAO.
- **10% Appeal Bonds**: Raising a dispute requires a 10% Appeal Bond in GEN, preventing dispute spamming.
- **AI Referee Arbitration**: Disputed bounties are resolved on-chain by an independent AI Referee (`resolve_dispute_via_referee`).

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
│   │   │   ├── Navbar.tsx           # HUD Header & Safe Withdrawable Credit Vault Claim
│   │   │   ├── StatsOverview.tsx    # TVL, active experiments & AI metrics cards
│   │   │   ├── SpectrogramDiffViewer.tsx # Dual-pane spectrogram & kinetic curve diff chart
│   │   │   ├── ConsensusReactionHUD.tsx  # Radar metric breakdown, Hash Integrity & Provenance HUD
│   │   │   ├── CountdownClock.tsx   # LED countdown timer for dispute cooling-off
│   │   │   ├── TaskCard.tsx         # Assay task status with Spec Hash & Hardware Provenance tags
│   │   │   ├── CreateTaskModal.tsx  # Sponsor bounty creation with Spec Hash Commitment
│   │   │   ├── AcceptTaskModal.tsx  # Lab 20% stake cashing form
│   │   │   ├── SubmitTelemetryModal.tsx # Telemetry submission with Hardware Provenance & LIMS export
│   │   │   ├── RaiseDisputeModal.tsx# Dispute filing with 10% Appeal Bond
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

## ⚡ Verification & Test Execution

### 1. Run Smart Contract Test Suite
```bash
python scripts/verify_contract.py
```
Expected output:
```
======================================================================
 BioIntelEscrow - Contract Verification & Test Suite Runner
======================================================================
[OK] Contract file detected: contracts\BioIntelEscrow.py
[OK] Test suite detected: tests\test_bio_intel_escrow.py
[OK] Contract Python syntax validation: PASSED

--- Running Unit Test Suite ---
.....
Ran 5 tests in 0.002s
OK
======================================================================
 SUCCESS: All BioIntelEscrow smart contract tests passed!
 GenLayer Score 5 Standard: VERIFIED
======================================================================
```

### 2. Run On-Chain Test Flow
```bash
cd frontend
$env:PRIVATE_KEY="0x_YOUR_PRIVATE_KEY"
node scripts/test_onchain_flow.js
```

---

## 📜 License
MIT
