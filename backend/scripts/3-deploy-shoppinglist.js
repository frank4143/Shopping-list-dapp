// deploy_shoppinglist.js

import dotenv from "dotenv";
import algosdk from "algosdk";
import { open, writeFile } from "node:fs/promises";
import path from "path";

dotenv.config();

// === Configure Algod client ===
const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || "";
const ALGOD_PORT  = process.env.ALGOD_PORT  || "";

// Recover your account from MNEMONIC in .env
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("Error: MNEMONIC not set in .env");
  process.exit(1);
}
const myaccount = algosdk.mnemonicToSecretKey(mnemonic);
const sender    = myaccount.addr;

// Instantiate client
const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, BASE_SERVER, ALGOD_PORT);

// Helper to compile TEAL
async function compileProgram(client, tealSource) {
  const encoder = new TextEncoder();
  const bytes   = encoder.encode(tealSource);
  const resp    = await client.compile(bytes).do();
  return new Uint8Array(Buffer.from(resp.result, "base64"));
}

(async () => {
  try {
    // ── App parameters ───────────────────────────────────────────────────────
    const localInts   = 0;
    const localBytes  = 0;
    const maxItems    = 10;
    const globalInts  = 1;         // Count
    const globalBytes = 4 * maxItems; // Name_i, Qty_i, Category_i, Note_i per item

    // ── Read TEAL sources ────────────────────────────────────────────────────
    const artDir      = path.resolve("contracts/artifacts");
    const approvalSrc = await open(path.join(artDir, "shoppinglist_approval.teal")).then(f => f.readFile("utf8"));
    const clearSrc    = await open(path.join(artDir, "shoppinglist_clear.teal")).then(f => f.readFile("utf8"));

    // ── Compile TEAL to bytecode ─────────────────────────────────────────────
    const approvalProgram = await compileProgram(algodClient, approvalSrc);
    const clearProgram    = await compileProgram(algodClient, clearSrc);

    // ── Get suggested params & createTxn ────────────────────────────────────
    const params = await algodClient.getTransactionParams().do();
    const txn = algosdk.makeApplicationCreateTxn(
      sender, params,
      algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram, clearProgram,
      localInts, localBytes,
      globalInts, globalBytes
    );

    // ── Sign, send & confirm ─────────────────────────────────────────────────
    const signedTx = txn.signTxn(myaccount.sk);
    console.log("Signed deployment tx ID:", txn.txID());
    await algodClient.sendRawTransaction(signedTx).do();
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txn.txID(), 4);

    // ── Print new App ID ────────────────────────────────────────────────────
    const appId = confirmedTxn["application-index"];
    console.log("🚀 Deployed ShoppingList app with App ID:", appId);

    // ── Write the App ID back into .env ─────────────────────────────────────
    const envPath = path.resolve(process.cwd(), ".env");
    const rawEnv  = await open(envPath).then(f => f.readFile("utf8"));
    const lines   = rawEnv.split(/\r?\n/);

    const key      = "SHOPPINGLIST_APP_ID";
    let updated    = false;
    const newLines = lines.map(line => {
      if (line.startsWith(`${key}=`)) {
        updated = true;
        return `${key}=${appId}`;
      }
      return line;
    });

    if (!updated) {
      newLines.push(`${key}=${appId}`);
    }

    await writeFile(envPath, newLines.join("\n"), "utf8");
    console.log(`✅ Updated .env with ${key}=${appId}`);
  } catch (err) {
    console.error("Deployment failed:", err);
    process.exit(1);
  }
})();
