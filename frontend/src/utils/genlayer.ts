import { AssayTask } from '../types/escrow';

export const DEFAULT_CONTRACT_ADDRESS = "0x89A3B5416B90b5C6F5dE4F63e0A320577789d7F4";

export const INITIAL_MOCK_TASKS: AssayTask[] = [
  {
    id: "assay_cas12a_kinetic_01",
    sponsor: "0xsponsor_desci_dao_88a1",
    lab: "0xreplication_lab_biotech_77c2",
    escrow_amount: "25000",
    lab_stake: "5000",
    status: "AWAITING_PAYOUT",
    protocol_url: "https://protocols.io/spec/cas12a_cleavage_v2.json",
    assay_log_url: "https://lab-logs.org/telemetry_cas12a_run99.csv",
    assay_name: "Cas12a Cleavage Kinetic Replication Assay",
    tolerance_criteria: "p-value < 0.01, R^2 > 0.98, CV < 5%",
    blacklist_anomalies: "Negative control cleaved, sensor saturation, reagent degradation",
    verdict: "APPROVED",
    reason: "R^2 = 0.994 (> 0.98), p < 0.001. All negative controls intact with 0.02 RFU background baseline.",
    confidence: "98",
    attempts: "1",
    payout_ready_at: String(Math.floor(Date.now() / 1000) + 54000), // ~15h remaining
    disputed_at: "0"
  },
  {
    id: "assay_gfp_expression_02",
    sponsor: "0xopen_bio_foundation_91b3",
    lab: "0x0000000000000000000000000000000000000000",
    escrow_amount: "15000",
    lab_stake: "0",
    status: "OPEN",
    protocol_url: "https://protocols.io/spec/gfp_expression_bl21.json",
    assay_log_url: "",
    assay_name: "BL21 Recombinant GFP Protein Yield Benchmark",
    tolerance_criteria: "OD600 target = 3.5 ± 0.2, Expression Yield > 120 mg/L",
    blacklist_anomalies: "Inclusion body aggregation, antibiotic selection breach",
    verdict: "NONE",
    reason: "Awaiting replication lab acceptance & 20% stake deposit",
    confidence: "0",
    attempts: "0",
    payout_ready_at: "0",
    disputed_at: "0"
  },
  {
    id: "assay_pcr_duplex_sensitivity_03",
    sponsor: "0xsponsor_desci_dao_88a1",
    lab: "0xgenomics_alpha_lab_33f1",
    escrow_amount: "40000",
    lab_stake: "8000",
    status: "DISPUTED",
    protocol_url: "https://protocols.io/spec/duplex_pcr_lod.json",
    assay_log_url: "https://lab-logs.org/telemetry_duplex_pcr_batch4.csv",
    assay_name: "RT-qPCR Duplex Target Detection Limit Replication",
    tolerance_criteria: "Ct value <= 28.5, Efficiency 95%-105%",
    blacklist_anomalies: "Primer dimer amplification in NTC wells",
    verdict: "APPROVED",
    reason: "[DISPUTED by 0xsponsor] Plate reader baseline blanking was uncalibrated; NTC curve drift reported.",
    confidence: "92",
    attempts: "1",
    payout_ready_at: String(Math.floor(Date.now() / 1000) + 12000),
    disputed_at: String(Math.floor(Date.now() / 1000) - 3600)
  },
  {
    id: "assay_enzyme_purification_04",
    sponsor: "0xbiochem_collective_12d4",
    lab: "0xsynbio_lab_berlin_44e9",
    escrow_amount: "18000",
    lab_stake: "3600",
    status: "IN_PROGRESS",
    protocol_url: "https://protocols.io/spec/taq_purification_affinity.json",
    assay_log_url: "",
    assay_name: "His-Tagged Polymerase Ni-NTA Purification Assay",
    tolerance_criteria: "Purity > 95% SDS-PAGE, Specific Activity > 8000 U/mg",
    blacklist_anomalies: "Protease degradation, elution peak broadening",
    verdict: "NONE",
    reason: "Experiment currently in progress at replication lab",
    confidence: "0",
    attempts: "0",
    payout_ready_at: "0",
    disputed_at: "0"
  }
];

// Memory store for local interactive simulation mode
let localTasksState: AssayTask[] = [...INITIAL_MOCK_TASKS];

export async function fetchAllAssayTasks(): Promise<AssayTask[]> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
      });

      const rawRes = await client.readContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_all_tasks',
        args: [],
      });

      if (rawRes) {
        const parsed = JSON.parse(String(rawRes));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("GenLayer Studionet connection unavailable; operating in Interactive Local Simulation Mode:", err);
  }
  return [...localTasksState];
}

export async function createAssayTaskOnChain(params: {
  taskId: string;
  protocolUrl: string;
  assayName: string;
  toleranceCriteria: string;
  blacklistAnomalies: string;
  escrowAmount: bigint;
  userAddress: string;
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'create_assay_task',
        args: [
          params.taskId,
          params.protocolUrl,
          params.assayName,
          params.toleranceCriteria,
          params.blacklistAnomalies
        ],
        value: params.escrowAmount,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Wallet transaction failed or not connected, using simulation fallback:", err);
  }

  // Local state update
  const newTask: AssayTask = {
    id: params.taskId,
    sponsor: params.userAddress.toLowerCase(),
    lab: "0x0000000000000000000000000000000000000000",
    escrow_amount: params.escrowAmount.toString(),
    lab_stake: "0",
    status: "OPEN",
    protocol_url: params.protocolUrl,
    assay_log_url: "",
    assay_name: params.assayName,
    tolerance_criteria: params.toleranceCriteria,
    blacklist_anomalies: params.blacklistAnomalies,
    verdict: "NONE",
    reason: "Awaiting replication lab acceptance",
    confidence: "0",
    attempts: "0",
    payout_ready_at: "0",
    disputed_at: "0"
  };

  localTasksState = [newTask, ...localTasksState];
  return true;
}

export async function acceptAssayTaskOnChain(params: {
  taskId: string;
  stakeAmount: bigint;
  userAddress: string;
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'accept_assay_task',
        args: [params.taskId],
        value: params.stakeAmount,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Simulation fallback for accept task:", err);
  }

  localTasksState = localTasksState.map(t => {
    if (t.id === params.taskId) {
      return {
        ...t,
        lab: params.userAddress.toLowerCase(),
        lab_stake: params.stakeAmount.toString(),
        status: "IN_PROGRESS" as const,
        reason: "Replication in progress by assigned lab"
      };
    }
    return t;
  });
  return true;
}

export async function submitAssayTelemetryOnChain(params: {
  taskId: string;
  assayLogUrl: string;
  userAddress: string;
  simulatedVerdict?: { verdict: 'APPROVED' | 'PARTIAL' | 'REFUND' | 'ESCALATE', confidence: number, reason: string };
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'submit_assay_telemetry',
        args: [params.taskId, params.assayLogUrl],
        value: 0n,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Simulation fallback for submit telemetry:", err);
  }

  const sim = params.simulatedVerdict || {
    verdict: 'APPROVED',
    confidence: 97,
    reason: "R^2 = 0.992, p < 0.005. Control channels verified."
  };

  const readyAt = sim.verdict === 'APPROVED' || sim.verdict === 'PARTIAL' 
    ? String(Math.floor(Date.now() / 1000) + 86400) 
    : "0";

  const nextStatus = sim.verdict === 'APPROVED' || sim.verdict === 'PARTIAL'
    ? 'AWAITING_PAYOUT'
    : sim.verdict === 'REFUND'
    ? 'NEEDS_REVISION'
    : 'ESCALATED';

  localTasksState = localTasksState.map(t => {
    if (t.id === params.taskId) {
      return {
        ...t,
        assay_log_url: params.assayLogUrl,
        attempts: String(parseInt(t.attempts || '0') + 1),
        verdict: sim.verdict,
        confidence: String(sim.confidence),
        reason: sim.reason,
        status: nextStatus as any,
        payout_ready_at: readyAt
      };
    }
    return t;
  });

  return true;
}

export async function raiseDisputeOnChain(params: {
  taskId: string;
  reason: string;
  userAddress: string;
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'raise_dispute',
        args: [params.taskId, params.reason],
        value: 0n,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Simulation fallback for raise dispute:", err);
  }

  localTasksState = localTasksState.map(t => {
    if (t.id === params.taskId) {
      return {
        ...t,
        status: 'DISPUTED' as const,
        disputed_at: String(Math.floor(Date.now() / 1000)),
        reason: `[DISPUTED by ${params.userAddress.slice(0, 8)}] ${params.reason}`
      };
    }
    return t;
  });
  return true;
}

export async function finalizePayoutOnChain(params: {
  taskId: string;
  userAddress: string;
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'finalize_payout',
        args: [params.taskId],
        value: 0n,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Simulation fallback for finalize payout:", err);
  }

  localTasksState = localTasksState.map(t => {
    if (t.id === params.taskId) {
      return {
        ...t,
        status: 'CLOSED' as const,
        escrow_amount: "0",
        lab_stake: "0",
        reason: "Escrow bounty disbursed to replication lab successfully"
      };
    }
    return t;
  });
  return true;
}

export async function resolveEscalationOnChain(params: {
  taskId: string;
  action: 'RELEASE' | 'REFUND' | 'SPLIT';
  userAddress: string;
}): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { createClient, chains } = await import('genlayer-js');
      const client = createClient({
        chain: chains.studionet,
        provider: (window as any).ethereum,
        account: params.userAddress as `0x${string}`,
      });

      const hash = await client.writeContract({
        address: DEFAULT_CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'resolve_escalation',
        args: [params.taskId, params.action],
        value: 0n,
      });

      await client.waitForTransactionReceipt({ hash });
      return true;
    }
  } catch (err) {
    console.warn("Simulation fallback for resolve escalation:", err);
  }

  localTasksState = localTasksState.map(t => {
    if (t.id === params.taskId) {
      return {
        ...t,
        status: 'CLOSED' as const,
        escrow_amount: "0",
        lab_stake: "0",
        reason: `Arbitration resolved via ${params.action}`
      };
    }
    return t;
  });
  return true;
}
