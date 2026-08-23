import { createClient, chains, createAccount } from 'genlayer-js';

const CONTRACT_ADDRESS = "0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85";

// Retrieve private key from environment or use a dummy message guide
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("==========================================================================");
    console.error(" ERROR: Private key missing!");
    console.error(" Please run this script with a funded Studionet private key:");
    console.error("   PRIVATE_KEY=0x... node scripts/test_onchain_flow.js");
    console.error("==========================================================================");
    process.exit(1);
  }

  console.log("=========================================");
  console.log(" Connecting to GenLayer Studionet RPC...");
  console.log(` Deployed Contract: ${CONTRACT_ADDRESS}`);
  console.log("=========================================");

  try {
    const account = createAccount(PRIVATE_KEY);
    console.log(`Using Wallet Address: ${account.address}`);

    const client = createClient({
      chain: chains.studionet,
      account: account,
    });

    const taskId = `task_crispr_${Date.now().toString().slice(-4)}`;
    console.log(`\n[1/3] Creating Assay Task on-chain: ${taskId}...`);

    // Call create_assay_task (payable)
    const createHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_assay_task',
      args: [
        taskId,
        "https://protocols.io/spec/crispr_cleavage.json",
        "Cas12a Cleavage Kinetic Replication Assay",
        "p-value < 0.01, R^2 > 0.98, CV < 5%",
        "Negative control cleaved, sensor saturation"
      ],
      value: 1000n, // Escrow bounty value
    });
    console.log(`Transaction Hash: ${createHash}`);
    console.log("Waiting for block confirmation...");
    await client.waitForTransactionReceipt({ hash: createHash });
    console.log("✓ Task created successfully!");

    // Check all tasks
    const tasksAfterCreate = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_all_tasks',
      args: [],
    });
    console.log("\nLive Tasks State:");
    console.log(JSON.parse(String(tasksAfterCreate)));

  } catch (err) {
    console.error("Error executing on-chain actions:", err);
  }
}

main();
