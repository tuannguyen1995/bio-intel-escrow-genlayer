import { createClient, chains, createAccount } from 'genlayer-js';

const CONTRACT_ADDRESS = '0x687E99e2F0C9851E4c2822730D47c897Da62978e';
const TASK_ID = `assay_cas12a_${Date.now().toString().slice(-4)}`;
const SPONSOR_PK = '0x0000000000000000000000000000000000000000000000000000000000000000_ROTATED';

async function main() {
  const sponsorAccount = createAccount(SPONSOR_PK);
  console.log('Sponsor Address:', sponsorAccount.address);
  const client = createClient({ chain: chains.studionet, account: sponsorAccount });

  console.log(`Creating task '${TASK_ID}' with 20 GEN bounty...`);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'create_assay_task',
    args: [
      TASK_ID,
      'https://raw.githubusercontent.com/tuannguyen1995/bio-intel-escrow-genlayer/main/README.md',
      'Cas12a Cleavage Kinetic Replication Assay',
      'p-value < 0.01, R^2 > 0.98, CV < 5%',
      'Negative control cleaved, sensor saturation',
      'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    ],
    value: 20n * 10n**18n, // 20 GEN
  });

  console.log('Tx Hash:', txHash);
  console.log('Waiting for receipt...');
  await client.waitForTransactionReceipt({ hash: txHash });
  console.log(`✓ Task '${TASK_ID}' successfully created on-chain!`);

  const rawTasks = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_all_tasks',
    args: []
  });
  console.log('All Tasks:', JSON.parse(String(rawTasks)));
}

main().catch(console.error);
