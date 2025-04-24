// scripts/3-deploy-shoppinglist.js

import dotenv from "dotenv";
import algosdk from "algosdk";
import { open } from "node:fs/promises";

dotenv.config();

// === Configure Algod client ===
// You can override BASE_SERVER in your .env, otherwise defaults to AlgoNode TestNet
const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN  = "";  // no token needed for AlgoNode
const ALGOD_PORT   = "";

// Recover your account from the MNEMONIC in .env
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("Error: MNEMONIC not set in .env");
  process.exit(1);
}
const myaccount = algosdk.mnemonicToSecretKey(mnemonic);
const sender = myaccount.addr;

// Instantiate Algod client
const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, BASE_SERVER, ALGOD_PORT);

// Helper to compile TEAL source to bytes
async function compileProgram(client, tealSource) {
  const encoder = new TextEncoder();
  const programBytes = encoder.encode(tealSource);
  const compileResponse = await client.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
}

(async () => {
  try {
    // === Parameters for your Shopping List app ===
    const localInts   = 0;   // no local state
    const localBytes  = 0;
    const globalInts  = 1;   // "Count" of items
    const globalBytes = 10;  // up to 10 items (each stored as a byte-string)

    // Read the compiled TEAL programs from artifacts
    const approvalFile = await open("./contracts/artifacts/shoppinglist_approval.teal");
    const clearFile    = await open("./contracts/artifacts/shoppinglist_clear.teal");
    const approvalSrc  = await approvalFile.readFile({ encoding: "utf8" });
    const clearSrc     = await clearFile.readFile({ encoding: "utf8" });

    // Compile TEAL to bytecode
    const approvalProgram = await compileProgram(algodClient, approvalSrc);
    const clearProgram    = await compileProgram(algodClient, clearSrc);

    // Get suggested params from network
    const params = await algodClient.getTransactionParams().do();

    // Create application transaction
    const onComplete = algosdk.OnApplicationComplete.NoOpOC; 
    const txn = algosdk.makeApplicationCreateTxn(
      sender,
      params,
      onComplete,
      approvalProgram,
      clearProgram,
      localInts,
      localBytes,
      globalInts,
      globalBytes
    );

    // Sign and send
    const signedTxn = txn.signTxn(myaccount.sk);
    console.log("Signed deployment tx with ID:", txn.txID().toString());
    await algodClient.sendRawTransaction(signedTxn).do();

    // Wait for confirmation
    const confirmed = await algosdk.waitForConfirmation(algodClient, txn.txID().toString(), 4);

    // Extract and print the new app ID
    const transactionResponse = await algodClient.pendingTransactionInformation(txn.txID().toString()).do();
    const appId = transactionResponse["application-index"];
    console.log("🚀 Deployed ShoppingList app with App ID:", appId);

  } catch (err) {
    console.error("Failed to deploy ShoppingList app:", err);
    process.exit(1);
  }
})();
