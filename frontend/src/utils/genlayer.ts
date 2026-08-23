import { AssayTask } from '../types/escrow';

export const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85";

export async function fetchAllAssayTasks(contractAddress = DEFAULT_CONTRACT_ADDRESS): Promise<AssayTask[]> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to interact with GenLayer Studionet.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
  });

  const rawRes = await client.readContract({
    address: contractAddress as `0x${string}`,
    functionName: 'get_all_tasks',
    args: [],
  });

  if (!rawRes) return [];
  const parsed = JSON.parse(String(rawRes));
  return Array.isArray(parsed) ? parsed : [];
}

export async function createAssayTaskOnChain(params: {
  taskId: string;
  protocolUrl: string;
  assayName: string;
  toleranceCriteria: string;
  blacklistAnomalies: string;
  escrowAmount: bigint;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
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
  return hash;
}

export async function acceptAssayTaskOnChain(params: {
  taskId: string;
  stakeAmount: bigint;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'accept_assay_task',
    args: [params.taskId],
    value: params.stakeAmount,
  });

  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export async function submitAssayTelemetryOnChain(params: {
  taskId: string;
  assayLogUrl: string;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'submit_assay_telemetry',
    args: [params.taskId, params.assayLogUrl],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export async function raiseDisputeOnChain(params: {
  taskId: string;
  reason: string;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'raise_dispute',
    args: [params.taskId, params.reason],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export async function finalizePayoutOnChain(params: {
  taskId: string;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'finalize_payout',
    args: [params.taskId],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export async function resolveEscalationOnChain(params: {
  taskId: string;
  action: 'RELEASE' | 'REFUND' | 'SPLIT';
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'resolve_escalation',
    args: [params.taskId, params.action],
    value: 0n,
  });

  await client.waitForTransactionReceipt({ hash });
  return hash;
}
