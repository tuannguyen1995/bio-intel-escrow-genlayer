import { AssayTask } from '../types/escrow';

export const CANONICAL_CONTRACT_ADDRESS = "0xa6c559E9ca708d628cB0e4F3bfE2BbE895D7cDA7";
export const DEFAULT_CONTRACT_ADDRESS = CANONICAL_CONTRACT_ADDRESS;

export async function fetchAllAssayTasks(contractAddress = DEFAULT_CONTRACT_ADDRESS): Promise<AssayTask[]> {
  try {
    const { createClient } = await import('genlayer-js');
    const client = createClient({
      endpoint: 'https://studio.genlayer.com/api',
    });

    const rawRes = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_all_tasks',
      args: [],
    });

    if (!rawRes) return [];
    const parsed = JSON.parse(String(rawRes));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return [];
  }
}

export async function fetchWithdrawableBalance(account: string, contractAddress = DEFAULT_CONTRACT_ADDRESS): Promise<string> {
  if (!account) return "0";

  try {
    const { createClient } = await import('genlayer-js');
    const client = createClient({
      endpoint: 'https://studio.genlayer.com/api',
    });

    const rawRes = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_withdrawable_balance',
      args: [account],
    });

    return String(rawRes || "0");
  } catch {
    return "0";
  }
}

export const STUDIONET_CHAIN_ID_HEX = '0xf22f'; // 61999

export async function ensureGenLayerNetwork(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).ethereum) return;
  try {
    const currentChainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
    if (currentChainId && currentChainId.toLowerCase() !== STUDIONET_CHAIN_ID_HEX.toLowerCase()) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: STUDIONET_CHAIN_ID_HEX,
              chainName: 'GenLayer Studio Network',
              rpcUrls: ['https://studio.genlayer.com/api'],
              nativeCurrency: {
                name: 'GEN Token',
                symbol: 'GEN',
                decimals: 18,
              },
              blockExplorerUrls: ['https://genlayer-explorer.vercel.app'],
            }],
          });
        }
      }
    }
  } catch (err) {
    console.warn("ensureGenLayerNetwork warning:", err);
  }
}

export async function waitForFinalizedAndFinishedWithReturn(client: any, hash: `0x${string}` | string): Promise<any> {
  const { TransactionStatus, ExecutionResult } = await import('genlayer-js/types');
  const receipt = await client.waitForTransactionReceipt({
    hash: hash as `0x${string}`,
    status: TransactionStatus.FINALIZED,
  });

  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(
      `Transaction finalized with unsuccessful execution status: ${receipt.txExecutionResultName || 'FAILED'}. State was not updated.`
    );
  }
  return receipt;
}

export async function createAssayTaskOnChain(params: {
  taskId: string;
  protocolUrl: string;
  assayName: string;
  toleranceCriteria: string;
  blacklistAnomalies: string;
  protocolSpecHash: string;
  escrowAmount: bigint;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  await ensureGenLayerNetwork();

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
      params.blacklistAnomalies,
      params.protocolSpecHash
    ],
    value: params.escrowAmount,
  });

  await waitForFinalizedAndFinishedWithReturn(client, hash);
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

  await ensureGenLayerNetwork();

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

  await waitForFinalizedAndFinishedWithReturn(client, hash);
  return hash;
}

export async function submitAssayTelemetryOnChain(params: {
  taskId: string;
  assayLogUrl: string;
  isZkMode: boolean;
  zkProofHash: string;
  assayLogHash?: string;
  labProvenanceSig?: string;
  provenanceType?: string;
  instrumentId?: string;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  await ensureGenLayerNetwork();

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
    args: [
      params.taskId,
      params.assayLogUrl,
      params.isZkMode,
      params.zkProofHash,
      params.assayLogHash || "",
      params.labProvenanceSig || "",
      params.provenanceType || "LIMS_RAW_EXPORT",
      params.instrumentId || ""
    ],
    value: 0n,
  });

  await waitForFinalizedAndFinishedWithReturn(client, hash);
  return hash;
}

export async function raiseDisputeOnChain(params: {
  taskId: string;
  reason: string;
  appealBondValue: bigint;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  await ensureGenLayerNetwork();

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
    value: params.appealBondValue,
  });

  await waitForFinalizedAndFinishedWithReturn(client, hash);
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

  await ensureGenLayerNetwork();

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

  await waitForFinalizedAndFinishedWithReturn(client, hash);
  return hash;
}

export async function withdrawCreditsOnChain(params: {
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  await ensureGenLayerNetwork();

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'withdraw_credits',
    args: [],
    value: 0n,
  });

  await waitForFinalizedAndFinishedWithReturn(client, hash);
  return hash;
}

export async function resolveDisputeViaRefereeOnChain(params: {
  taskId: string;
  userAddress: string;
  contractAddress?: string;
}): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error("No Web3 wallet detected. Please install MetaMask to execute on-chain transactions.");
  }

  await ensureGenLayerNetwork();

  const { createClient, chains } = await import('genlayer-js');
  const client = createClient({
    chain: chains.studionet,
    provider: (window as any).ethereum,
    account: params.userAddress as `0x${string}`,
  });

  const targetContract = params.contractAddress || DEFAULT_CONTRACT_ADDRESS;

  const hash = await client.writeContract({
    address: targetContract as `0x${string}`,
    functionName: 'resolve_dispute_via_referee',
    args: [params.taskId],
    value: 0n,
  });

  await waitForFinalizedAndFinishedWithReturn(client, hash);
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

  await ensureGenLayerNetwork();

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

  await waitForFinalizedAndFinishedWithReturn(client, hash);
  return hash;
}
