// scripts/4-test-shoppinglist.js

import dotenv from "dotenv";
import algosdk from "algosdk";

dotenv.config();

const appId = Number(process.env.SHOPPINGLIST_APP_ID);
if (!appId) { console.error("Error: SHOPPINGLIST_APP_ID not set"); process.exit(1); }

const mnemonic = process.env.MNEMONIC;
if (!mnemonic)  { console.error("Error: MNEMONIC not set"); process.exit(1); }

const myaccount = algosdk.mnemonicToSecretKey(mnemonic);
const sender    = myaccount.addr;

const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const algodClient = new algosdk.Algodv2("", BASE_SERVER, "");

// Helper to decode and print the global state
async function readGlobalState(client, index) {
  const info = await client.getApplicationByID(index).do();
  const state = info.params["global-state"] || [];
  console.log("Global State:");
  state.forEach(kv => {
    const rawKey = Buffer.from(kv.key, "base64");
    let keyName = rawKey.toString("ascii");
    if (rawKey.length > 5) {
      const idxBytes = rawKey.slice(5);
      const idxNum   = idxBytes.reduce((a, b) => a * 256 + b, 0);
      keyName += idxNum;
    }
    const val = kv.value.type === 1
      ? Buffer.from(kv.value.bytes, "base64").toString()
      : kv.value.uint;
    console.log(`  ${keyName} → ${val}`);
  });
}

(async () => {
  try {
    console.log("=== Initial State ===");
    await readGlobalState(algodClient, appId);

    // 1) Add "Milk"
    let params = await algodClient.getTransactionParams().do();
    console.log("\n=== Adding 'Milk' ===");
    const addArgs = [
      new Uint8Array(Buffer.from("Add")),
      new Uint8Array(Buffer.from("Milk"))
    ];
    const addTxn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, addArgs);
    const signedAdd = addTxn.signTxn(myaccount.sk);
    const addTxId   = addTxn.txID().toString();
    console.log("Submitted Add txn with ID:", addTxId);
    await algodClient.sendRawTransaction(signedAdd).do();
    await algosdk.waitForConfirmation(algodClient, addTxId, 4);

    console.log("=== State After Add ===");
    await readGlobalState(algodClient, appId);

    // 2) Remove index 0 (properly encoded)
    params = await algodClient.getTransactionParams().do();
    console.log("\n=== Removing index 0 ===");
    const removeArgs = [
      new Uint8Array(Buffer.from("Remove")),
      algosdk.encodeUint64(0)       // <<< correct integer encoding
    ];
    const remTxn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, removeArgs);
    const signedRem = remTxn.signTxn(myaccount.sk);
    const remTxId   = remTxn.txID().toString();
    console.log("Submitted Remove txn with ID:", remTxId);
    await algodClient.sendRawTransaction(signedRem).do();
    await algosdk.waitForConfirmation(algodClient, remTxId, 4);

    console.log("=== State After Remove ===");
    await readGlobalState(algodClient, appId);

  } catch (err) {
    console.error("Test script failed:", err);
    process.exit(1);
  }
})();
