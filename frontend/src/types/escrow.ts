export type TaskStatus = 
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_PAYOUT'
  | 'NEEDS_REVISION'
  | 'DISPUTED'
  | 'ESCALATED'
  | 'CLOSED';

export type TaskVerdict = 'NONE' | 'APPROVED' | 'PARTIAL' | 'REFUND' | 'ESCALATE';

export interface AssayTask {
  id: string;
  sponsor: string;
  lab: string;
  escrow_amount: string;
  lab_stake: string;
  status: TaskStatus;
  protocol_url: string;
  assay_log_url: string;
  assay_name: string;
  tolerance_criteria: string;
  blacklist_anomalies: string;
  verdict: TaskVerdict;
  reason: string;
  confidence: string;
  attempts: string;
  payout_ready_at: string;
  disputed_at: string;
}

export interface SpectrophotometryDataPoint {
  timeMinutes: number;
  wavelength: number; // nm (e.g. 600nm OD600)
  baselineOD: number;  // Baseline protocol OD600
  sampleOD: number;    // Lab actual measured OD600
  baselineRFU: number; // Baseline Fluorescence (RFU)
  sampleRFU: number;   // Lab actual Fluorescence
  upperLimit: number;  // Statistical tolerance upper bound (+sigma)
  lowerLimit: number;  // Statistical tolerance lower bound (-sigma)
}

export interface ConsensusReactionMetrics {
  pValue: number;           // e.g. 0.002 (< 0.01)
  rSquared: number;         // e.g. 0.994 (> 0.98)
  cvPercent: number;        // e.g. 3.2% (< 5%)
  driftPercent: number;     // e.g. 1.8%
  contaminationDetected: boolean;
  confidenceScore: number;  // e.g. 98%
  status: 'OPTIMAL' | 'DEVIATED' | 'CRITICAL';
}

export type UserRole = 'SPONSOR' | 'LAB' | 'ADMIN' | 'ANONYMOUS';
