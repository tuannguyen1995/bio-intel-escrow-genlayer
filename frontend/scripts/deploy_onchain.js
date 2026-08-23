import fs from 'fs';
import path from 'path';
import { createClient, chains, createAccount } from 'genlayer-js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_PATH = path.resolve('../contracts/BioIntelEscrow.py');

async function main() {
  if (!PRIVATE_KEY) {
    console.error("Please provide PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  console.log("=========================================");
  console.log(" Deploying BioIntelEscrow to Studionet...");
  console.log(` Contract File: ${CONTRACT_PATH}`);
  console.log("=========================================");

  try {
    const account = createAccount(PRIVATE_KEY);
    const client = createClient({
      chain: chains.studionet,
      account: account,
    });

    const code = fs.readFileSync(CONTRACT_PATH, 'utf8');

    console.log("Sending deploy transaction...");
    const deployHash = await client.deployContract({
      code: code,
      args: [],
    });
    console.log(`Transaction Hash: ${deployHash}`);

    console.log("Waiting for deployment receipt...");
    const receipt = await client.waitForTransactionReceipt({ hash: deployHash });
    
    // In genlayer-js, the contract address is returned in the receipt.contractAddress
    const contractAddress = receipt.contractAddress;
    console.log("==================================================");
    console.log(" SUCCESS! Contract deployed successfully.");
    console.log(` New Deployed Address: ${contractAddress}`);
    console.log("==================================================");

  } catch (err) {
    console.error("Deployment failed:", err);
  }
}

main();
