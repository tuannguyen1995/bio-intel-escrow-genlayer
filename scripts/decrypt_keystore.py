import json
from eth_account import Account

keystore_path = r'C:\Users\Admin\.genlayer\keystores\default.json'
with open(keystore_path, 'r') as f:
    keystore = json.load(f)

passwords = [
    "", "password", "123456", "default", "genlayer",
    "Admin", "admin", "Admin-PC", "ADMIN-PC",
    "tuannguyen", "tuannguyen1995", "tuanbds.pmh@gmail.com",
    "12345678", "123456789", "pass", "key",
    "studionet", "localnet", "studionet-password", "default-password",
    "BioIntelEscrow", "bio-intel-escrow", "1234"
]

found = False
for pw in passwords:
    try:
        private_key = Account.decrypt(keystore, pw)
        print("==================================================")
        print(f" SUCCESS! Keystore decrypted with password: '{pw}'")
        print(" Private Key:", private_key.hex())
        print("==================================================")
        found = True
        break
    except Exception as e:
        pass

if not found:
    print("Failed to decrypt with expanded passwords list.")
