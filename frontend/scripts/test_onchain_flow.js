import { createClient, chains, createAccount, generatePrivateKey } from 'genlayer-js';

const CONTRACT_ADDRESS = "0xe1Df056158E0869e1d0ee142EAF57b4c2bcc9b85";
const SPONSOR_PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  if (!SPONSOR_PRIVATE_KEY) {
    console.error("Please provide PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  try {
    const sponsorAccount = createAccount(SPONSOR_PRIVATE_KEY);
    const sponsorClient = createClient({
      chain: chains.studionet,
      account: sponsorAccount,
    });

    console.log(`[Sponsor] Address: ${sponsorAccount.address}`);

    // Generate a random private key for the Lab
    const labPrivateKey = generatePrivateKey();
    const labAccount = createAccount(labPrivateKey);
    const labClient = createClient({
      chain: chains.studionet,
      account: labAccount,
    });

    console.log(`[Lab] Address: ${labAccount.address}`);

    // 1. Sponsor transfers 5000 GEN to the Lab to fund its cọc/staking
    console.log("\n[Sponsor -> Lab] Funding Lab account with 5000 GEN for staking...");
    const fundHash = await sponsorClient.sendTransaction({
      to: labAccount.address,
      value: 5000n * 10n ** 18n, // 5000 GEN
    });
    console.log(`Transfer Hash: ${fundHash}`);
    await sponsorClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("✓ Lab account funded!");

    // 2. Sponsor creates a new task
    const taskId = `task_crispr_${Date.now().toString().slice(-4)}`;
    console.log(`\n[Sponsor] Creating Assay Task: ${taskId}...`);
    const createHash = await sponsorClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_assay_task',
      args: [
        taskId,
        "https://protocols.io/spec/crispr_cleavage.json",
        "Cas12a Cleavage Kinetic Replication Assay",
        "p-value < 0.01, R^2 > 0.98, CV < 5%",
        "Negative control cleaved"
      ],
      value: 1000n * 10n ** 18n, // 1000 GEN bounty
    });
    await sponsorClient.waitForTransactionReceipt({ hash: createHash });
    console.log("✓ Task created!");

    // 3. Lab accepts the task (depositing 20% stake = 200 GEN)
    console.log(`\n[Lab] Accepting task: ${taskId} with 200 GEN stake...`);
    const acceptHash = await labClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'accept_assay_task',
      args: [taskId],
      value: 200n * 10n ** 18n, // 20% cọc
    });
    await labClient.waitForTransactionReceipt({ hash: acceptHash });
    console.log("✓ Task accepted by Lab!");

    // 4. Lab submits telemetry log URL (triggering AI Consensus validation)
    console.log(`\n[Lab] Submitting telemetry for AI validation...`);
    const submitHash = await labClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'submit_assay_telemetry',
      args: [taskId, "https://lab-logs.org/telemetry_cas12a_run99.csv"],
      value: 0n,
    });
    await labClient.waitForTransactionReceipt({ hash: submitHash });
    console.log("✓ Telemetry submitted and AI consensus execution completed!");

    // 5. Query final state on-chain
    const tasks = await sponsorClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_all_tasks',
      args: [],
    });
    const parsed = JSON.parse(String(tasks));
    const finalTask = parsed.find(t => t.id === taskId);
    
    console.log("\n==================================================");
    console.log(" FINAL TASK STATE ON-CHAIN:");
    console.log(JSON.stringify(finalTask, null, 2));
    console.log("==================================================");

  } catch (err) {
    console.error("Transaction flow error:", err);
  }
}

main();
