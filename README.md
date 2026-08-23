# BioIntelEscrow (Decentralized Open-Science Protocol & Biomolecular Assay Replication Escrow)

[![Live Demo](https://img.shields.io/badge/Vercel_Live_App-BioIntelEscrow-000000?style=for-the-badge&logo=vercel)](https://bio-intel-escrow.vercel.app)
[![GenLayer Contract Standard](https://img.shields.io/badge/GenLayer-v0.2.18-10B981?style=for-the-badge&logo=python)](https://genlayer.com)
[![GenLayer Score](https://img.shields.io/badge/GenLayer_Score-5.0_Verified-06B6D4?style=for-the-badge)](https://genlayer.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)

**BioIntelEscrow** là nền tảng ký quỹ nghiên cứu khoa học mở và nhân bản thí nghiệm sinh học phân tử (DeSci) phi tập trung trên GenLayer. Nền tảng cho phép các quỹ nghiên cứu/DAO (Sponsor) treo giải thưởng bounty cho các phòng lab độc lập (Replication Labs) để nhân bản và thẩm định quy trình thí nghiệm (tinh sạch enzyme, biểu hiện protein, assay độ nhạy PCR, CRISPR Cas12a cleavage).

🔗 **Live Vercel Application**: [https://bio-intel-escrow.vercel.app](https://bio-intel-escrow.vercel.app)  
🐙 **GitHub Repository**: [https://github.com/tuannguyen1995/BioIntelEscrow](https://github.com/tuannguyen1995/BioIntelEscrow)

---

## 🧬 Architectural Highlights

### 1. Multi-Agent AI VM Consensus
- **Anti-Rugpull Guard**: Tự động render baseline protocol spec từ HTTP/HTTPS endpoint qua `gl.nondet.web.render`. Bảo vệ phòng lab chống lại protocol hỏng hoặc lỗi 404.
- **Anti-Spam Guard**: Kiểm tra URL file log thực nghiệm / CSV telemetry trước khi chạy LLM evaluation.
- **Deterministic Consensus Framework**: So sánh độ tuyến tính $R^2 > 0.98$, ngưỡng p-value $p < 0.01$, hệ số biến thiên $CV < 5\%$, và tính toàn vẹn của kênh negative controls.

### 2. Mandatory 20% Lab Staking & Slashing
- Phòng lab độc lập phải đặt cọc tối thiểu **20% stake** tương ứng giá trị escrow để nhận thí nghiệm.
- **Cơ chế Slashing**: Sau 2 lần thất bại liên tiếp (REFUND), task bị đóng và toàn bộ khoản escrow **cùng tiền cọc bị slash của Lab** sẽ chuyển hoàn cho Sponsor DAO.

### 3. 24-Hour Dispute Cooling-Off Window
- Sau khi kết quả AI đạt `APPROVED` hoặc `PARTIAL`, tiền được khóa trong **24 giờ (86,400 giây)**.
- Trong thời gian này, Sponsor hoặc Lab có thể nhấn `raise_dispute()` để đóng băng payout và gửi yêu cầu phân xử (`RELEASE`, `REFUND`, `SPLIT`).

---

## 📁 Repository Structure

```
BioIntelEscrow/
├── contracts/
│   └── BioIntelEscrow.py            # Smart Contract GenLayer viết bằng Python
├── tests/
│   └── test_bio_intel_escrow.py     # Bộ unit test giả lập môi trường GenLayer VM
├── scripts/
│   └── verify_contract.py           # Script tự động kiểm tra cú pháp và chạy unit test
├── frontend/                        # Giao diện DeSci Cyber-Laboratory HUD UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Header HUD & Role Switcher
│   │   │   ├── StatsOverview.tsx    # Card TVL, thí nghiệm active & điểm AI
│   │   │   ├── SpectrogramDiffViewer.tsx # Dual-Pane xem thông số & đồ thị Kinetic
│   │   │   ├── ConsensusReactionHUD.tsx  # Radar metric breakdown & AI confidence
│   │   │   ├── CountdownClock.tsx   # Đồng hồ LED đếm ngược 24h khiếu nại
│   │   │   ├── TaskCard.tsx         # Card hiển thị bounty & action status
│   │   │   ├── CreateTaskModal.tsx  # Form tạo bounty dành cho Sponsor
│   │   │   ├── AcceptTaskModal.tsx  # Form đặt cọc 20% dành cho Lab
│   │   │   ├── SubmitTelemetryModal.tsx # Form nộp log telemetry (kèm 4 presets)
│   │   │   ├── RaiseDisputeModal.tsx# Form mở khiếu nại trong 24h
│   │   │   ├── ResolveEscalationModal.tsx # Panel phân xử dành cho Admin/Sponsor
│   │   │   └── AIConsensusModal.tsx # Visualizer mô phỏng multi-node AI consensus
│   │   ├── types/
│   │   │   └── escrow.ts
│   │   ├── utils/
│   │   │   └── genlayer.ts          # Tích hợp genlayer-js v0.2.x & simulation fallback
│   │   ├── App.tsx
│   │   ├── index.css                # CSS Bio-Dark theme & sci-fi glow
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── vercel.json
└── README.md
```

---

## ⚡ Verification & Deployment Guide

### 1. Kiểm thử Smart Contract
Run unittestsuite:
```bash
python scripts/verify_contract.py
```

### 2. Chạy Frontend cục bộ
```bash
cd frontend
npm install
npm run dev
```
Mở [http://localhost:3000](http://localhost:3000).

### 3. Deploy Smart Contract lên GenLayer Studionet
```bash
genlayer deploy contracts/BioIntelEscrow.py --chain studionet
```

---

## 📜 License

MIT License. Designed for GenLayer DeSci Hackathons.
