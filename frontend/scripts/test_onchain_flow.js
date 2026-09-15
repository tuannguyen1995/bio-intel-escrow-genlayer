import { createClient, chains, createAccount, generatePrivateKey } from 'genlayer-js';

const CONTRACT_ADDRESS = "0x3Db85A887d9affF398a3a1876CF1FDF5640699DE";
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

    // Generate a fresh random private key for the Lab
    const labPrivateKey = generatePrivateKey();
    const labAccount = createAccount(labPrivateKey);
    const labClient = createClient({
      chain: chains.studionet,
      account: labAccount,
    });

    console.log(`[Lab] Address: ${labAccount.address}`);

    // 1. Sponsor transfers 5000 GEN to the Lab to fund its cọc/staking
    console.log("\n[1/5] Funding Lab account with 5000 GEN for staking...");
    const fundHash = await sponsorClient.sendTransaction({
      to: labAccount.address,
      value: 5000n * 10n ** 18n, // 5000 GEN
    });
    console.log(`Fund Tx Hash: ${fundHash}`);
    await sponsorClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("✓ Lab account funded!");

    // 2. Sponsor creates a new task with Spec Hash Commitment
    const taskId = `task_crispr_${Date.now().toString().slice(-4)}`;
    console.log(`\n[2/5] [Sponsor] Creating Assay Task: ${taskId} with Spec Hash Commitment...`);
    const createHash = await sponsorClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_assay_task',
      args: [
        taskId,
        "https://protocols.io/spec/crispr_cleavage.json",
        "Cas12a Cleavage Kinetic Replication Assay",
        "p-value < 0.01, R^2 > 0.98, CV < 5%",
        "Negative control cleaved",
        "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      ],
      value: 1000n * 10n ** 18n, // 1000 GEN bounty
    });
    console.log(`Create Task Tx Hash: ${createHash}`);
    await sponsorClient.waitForTransactionReceipt({ hash: createHash });
    console.log("✓ Task created with immutable hash commitment!");

    // 3. Lab accepts the task (depositing 20% stake = 200 GEN)
    console.log(`\n[3/5] [Lab] Accepting task: ${taskId} with 200 GEN stake...`);
    const acceptHash = await labClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'accept_assay_task',
      args: [taskId],
      value: 200n * 10n ** 18n, // 20% cọc
    });
    console.log(`Accept Task Tx Hash: ${acceptHash}`);
    await labClient.waitForTransactionReceipt({ hash: acceptHash });
    console.log("✓ Task accepted by Lab with 20% stake!");

    // 4. Lab submits telemetry with Evidence Hash and Hardware Instrument Attestation
    console.log(`\n[4/5] [Lab] Submitting telemetry with LIMS & Instrument Provenance for AI validation...`);
    const submitHash = await labClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'submit_assay_telemetry',
      args: [
        taskId,
        "https://lab-logs.org/telemetry_cas12a_run99.csv",
        false, // is_zk_mode
        "",    // zk_proof_hash
        "sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945", // assay_log_hash
        "0x9c3f4e2b1a8d7c6e5f4a3b2c1d0e9f8a7b6c5d4e...lab_sig", // lab_provenance_sig
        "SPECTROMETER_HARDWARE_ATTESTATION", // provenance_type
        "Biotek-Synergy-H1-SN48821" // instrument_id
      ],
      value: 0n,
    });
    console.log(`Submit Telemetry Tx Hash: ${submitHash}`);
    await labClient.waitForTransactionReceipt({ hash: submitHash });
    console.log("✓ Telemetry submitted and Multi-Agent AI consensus adjudication completed!");

    // 5. Query final state on-chain
    console.log(`\n[5/5] Querying final on-chain task state and withdrawable balance...`);
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

    console.log("\nSUMMARY OF TRANSACTIONS FOR STEWARD REVIEW:");
    console.log(`1. Funding Tx:      https://explorer-studio.genlayer.com/tx/${fundHash}`);
    console.log(`2. Create Task:     https://explorer-studio.genlayer.com/tx/${createHash}`);
    console.log(`3. Accept Task:     https://explorer-studio.genlayer.com/tx/${acceptHash}`);
    console.log(`4. Submit Telemetry:https://explorer-studio.genlayer.com/tx/${submitHash}`);

  } catch (err) {
    console.error("Transaction flow error:", err);
  }
}

main();
