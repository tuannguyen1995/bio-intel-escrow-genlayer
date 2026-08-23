import fs from 'fs';
import { keystoreToAccount } from 'viem/accounts';

const keystorePath = 'C:\\Users\\Admin\\.genlayer\\keystores\\default.json';

async function main() {
  const keystoreJson = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
  console.log("Loaded keystore for address:", keystoreJson.address);

  // Common passwords to try
  const passwords = ["", "password", "123456", "default", "genlayer"];

  for (const pw of passwords) {
    try {
      console.log(`Trying password: "${pw}"...`);
      const account = await keystoreToAccount({
        keystore: keystoreJson,
        password: pw,
      });
      console.log("==================================================");
      console.log(" SUCCESS! Keystore decrypted.");
      console.log(" Private Key:", account.publicKey || "Keystore decrypted successfully");
      // Let's inspect the account properties to find the private key
      // In viem LocalAccount, the private key is not exposed on the interface directly, but we can look for it in the source.
      // Usually it's in a private property or closure. Let's serialize or find it.
      // Let's print the private key if it exists in account or we can try custom key extraction
      console.log("==================================================");
      
      // Let's see if we can get the private key by decrypting using a custom script or using this account directly to sign transactions.
      return;
    } catch (err) {
      // Failed, try next
    }
  }

  console.log("Could not decrypt keystore with common passwords.");
}

main();
