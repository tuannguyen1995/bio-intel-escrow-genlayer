import { createClient, chains } from 'genlayer-js';

const CONTRACT_ADDRESS = "0x687E99e2F0C9851E4c2822730D47c897Da62978e";

async function main() {
  console.log("=========================================");
  console.log(" Connecting to GenLayer Studionet RPC...");
  console.log(` Deployed Contract: ${CONTRACT_ADDRESS}`);
  console.log("=========================================");

  try {
    const client = createClient({
      chain: chains.studionet,
    });

    console.log("Reading all assay tasks on-chain...");
    const rawRes = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_all_tasks',
      args: [],
    });

    console.log("\nRaw Result from contract:");
    console.log(rawRes);

    const parsed = JSON.parse(String(rawRes));
    console.log(`\nFound ${parsed.length} tasks on-chain:`);
    console.log(JSON.stringify(parsed, null, 2));

  } catch (err) {
    console.error("Error interacting with contract:", err);
  }
}

main();
