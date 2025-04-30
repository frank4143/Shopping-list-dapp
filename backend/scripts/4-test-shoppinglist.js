// scripts/4-test-shoppinglist.js

import dotenv from "dotenv";
import algosdk from "algosdk";

dotenv.config();

const appId = Number(process.env.SHOPPINGLIST_APP_ID);
if (!appId) {
  console.error("Error: SHOPPINGLIST_APP_ID not set");
  process.exit(1);
}

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("Error: MNEMONIC not set");
  process.exit(1);
}

const myaccount   = algosdk.mnemonicToSecretKey(mnemonic);
const sender      = myaccount.addr;
const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const algodClient = new algosdk.Algodv2("", BASE_SERVER, "");

// Pretty‐print the enhanced global state
async function readGlobalState(client, index) {
  const info  = await client.getApplicationByID(index).do();
  const state = info.params["global-state"] || [];
  const result = { count: 0, items: [] };

  for (const kv of state) {
    // Decode raw key bytes
    const rawKey = Buffer.from(kv.key, "base64");
    const keyStr = rawKey.toString("utf8");

    // Decode the value
    const val = kv.value.type === 1
      ? Buffer.from(kv.value.bytes, "base64").toString("utf8")
      : kv.value.uint;

    // Special‐case the plain "Count" key
    if (keyStr === "Count") {
      result.count = Number(val);
      continue;
    }

    // Otherwise the key = prefix + 8‐byte big‐endian index
    const len = rawKey.length;
    const idx = Number(rawKey.readBigUInt64BE(len - 8));
    const prefixWithUS = rawKey.slice(0, len - 8).toString("utf8"); // e.g. "Name_"
    const prefix = prefixWithUS.replace(/_$/, "");                  // drop trailing "_"

    // Initialize slot if needed
    result.items[idx] = result.items[idx] || { name: "", qty: "", category: "", note: "" };
    if (prefix === "Name")     result.items[idx].name     = val;
    if (prefix === "Qty")      result.items[idx].qty      = val;
    if (prefix === "Category") result.items[idx].category = val;
    if (prefix === "Note")     result.items[idx].note     = val;
  }

  console.log("Global State:", JSON.stringify(result, null, 2));
  return result;
}

// Helper to send an App NoOp call
async function callApp(args) {
  const params = await algodClient.getTransactionParams().do();
  const txn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, args);
  const signed = txn.signTxn(myaccount.sk);
  const txId   = txn.txID().toString();
  await algodClient.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);
  return txId;
}

(async () => {
  try {
    console.log("=== 0) Initial State ===");
    await readGlobalState(algodClient, appId);

    // 1) Add: name="Eggs", qty=12, category="Dairy", note="Organic"
    console.log("\n=== 1) Adding Eggs ===");
    let txId = await callApp([
      new Uint8Array(Buffer.from("Add")),
      new Uint8Array(Buffer.from("Eggs")),
      new Uint8Array(Buffer.from("12")),
      new Uint8Array(Buffer.from("Dairy")),
      new Uint8Array(Buffer.from("Organic"))
    ]);
    console.log("Add txId:", txId);
    await readGlobalState(algodClient, appId);

    // 2) Add: name="Milk", qty=1, category="Dairy", note="Skimmed"
    console.log("\n=== 2) Adding Milk ===");
    txId = await callApp([
      new Uint8Array(Buffer.from("Add")),
      new Uint8Array(Buffer.from("Milk")),
      new Uint8Array(Buffer.from("1")),
      new Uint8Array(Buffer.from("Dairy")),
      new Uint8Array(Buffer.from("Skimmed"))
    ]);
    console.log("Add txId:", txId);
    await readGlobalState(algodClient, appId);

    // 3) Update idx=0 → Bread, qty=2, category=Bakery, note=Whole wheat
    console.log("\n=== 3) Updating idx=0 to Bread ===");
    txId = await callApp([
      new Uint8Array(Buffer.from("Update")),
      algosdk.encodeUint64(0),
      new Uint8Array(Buffer.from("Bread")),
      new Uint8Array(Buffer.from("2")),
      new Uint8Array(Buffer.from("Bakery")),
      new Uint8Array(Buffer.from("Whole wheat"))
    ]);
    console.log("Update txId:", txId);
    await readGlobalState(algodClient, appId);

    // 4) Remove idx=1 (Milk)
    console.log("\n=== 4) Removing idx=1 (Milk) ===");
    txId = await callApp([
      new Uint8Array(Buffer.from("Remove")),
      algosdk.encodeUint64(1)
    ]);
    console.log("Remove txId:", txId);
    await readGlobalState(algodClient, appId);

    // 5) ClearAll
    console.log("\n=== 5) Clearing all items ===");
    txId = await callApp([
      new Uint8Array(Buffer.from("ClearAll"))
    ]);
    console.log("ClearAll txId:", txId);
    await readGlobalState(algodClient, appId);

    console.log("\n✅ All tests completed successfully.");
  } catch (err) {
    console.error("Test script failed:", err);
    process.exit(1);
  }
})();
