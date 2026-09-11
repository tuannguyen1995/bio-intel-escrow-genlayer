import { createClient, chains, createAccount } from 'genlayer-js';

const CONTRACT_ADDRESS = '0x687E99e2F0C9851E4c2822730D47c897Da62978e';
const TASK_ID = 'tynamy';
const LAB_PK = '0xfb1fbd9ca13826ee88f6b2971640910e669a277de8492be2817b21f8df7aabd2';

async function run() {
  const labAccount = createAccount(LAB_PK);
  console.log('Lab Address:', labAccount.address);
  const client = createClient({ chain: chains.studionet, account: labAccount });
  const bal = await client.getBalance({ address: labAccount.address });
  console.log('Balance:', (bal / 10n**18n).toString(), 'GEN');

  console.log('\n--- Step 1: Accepting Task tynamy (Staking 20 GEN) ---');
  const acceptTx = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'accept_assay_task',
    args: [TASK_ID],
    value: 20n * 10n**18n,
  });
  console.log('Accept Tx Hash:', acceptTx);
  console.log('Waiting for receipt...');
  await client.waitForTransactionReceipt({ hash: acceptTx });
  console.log('✓ Task tynamy Accepted!');

  const res1 = await client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_all_tasks', args: [] });
  console.log('Tasks after accept:', JSON.stringify(JSON.parse(String(res1)), null, 2));

  console.log('\n--- Step 2: Submitting Telemetry (Triggering AI Consensus) ---');
  // Telemetry URL for Cas12a
  const logUrl = 'https://raw.githubusercontent.com/tuannguyen1995/bio-intel-escrow-genlayer/main/tests/sample_telemetry.json';
  const submitTx = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'submit_assay_telemetry',
    args: [
      TASK_ID,
      logUrl,
      false,
      '',
      '',
      'sig_lab_cert_9981',
      'LIMS_RAW_EXPORT',
      'AGILENT_CARY_60'
    ],
  });
  console.log('Submit Telemetry Tx Hash:', submitTx);
  console.log('Waiting for GenLayer Multi-Agent AI Consensus in GenVM (approx 15-40s)...');
  await client.waitForTransactionReceipt({ hash: submitTx });
  console.log('✓ Telemetry Validated by GenVM Multi-Agent Board!');

  const res2 = await client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_all_tasks', args: [] });
  const parsed = JSON.parse(String(res2));
  const t = parsed.find(x => x.id === TASK_ID);
  console.log('\n=== FINAL ON-CHAIN TASK STATE ===');
  console.log(JSON.stringify(t, null, 2));
}

run().catch(console.error);
