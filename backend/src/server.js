// src/server.js

import dotenv from "dotenv";
import express from "express";
import algosdk from "algosdk";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*"   // or restrict to your frontend URL
}));

const PORT = process.env.PORT || 3000;

// Algod client configuration
const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const ALGOD_TOKEN  = process.env.ALGOD_TOKEN  || "";
const ALGOD_PORT   = process.env.ALGOD_PORT   || "";

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, BASE_SERVER, ALGOD_PORT);

// Account & App config
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("Error: MNEMONIC not set in .env");
  process.exit(1);
}
const account = algosdk.mnemonicToSecretKey(mnemonic);
const sender  = account.addr;

const appId = Number(process.env.SHOPPINGLIST_APP_ID);
if (!appId) {
  console.error("Error: SHOPPINGLIST_APP_ID not set in .env");
  process.exit(1);
}

// Custom wait-for-confirmation (up to `timeoutRounds`)
async function waitForConfirmation(client, txId, timeoutRounds = 10) {
  const status = await client.status().do();
  let round = status["last-round"] + 1;

  for (let i = 0; i < timeoutRounds; i++) {
    const pending = await client.pendingTransactionInformation(txId).do();
    if (pending["confirmed-round"] && pending["confirmed-round"] > 0) {
      return pending;
    }
    // wait for next block
    await client.statusAfterBlock(round + i).do();
  }

  throw new Error(`Transaction ${txId} not confirmed after ${timeoutRounds} rounds`);
}

// Helper: send an ApplicationNoOp call
async function callApp(appArgs) {
  const params = await algodClient.getTransactionParams().do();
  const txn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, appArgs);

  const signed = txn.signTxn(account.sk);
  const txId   = txn.txID().toString();
  await algodClient.sendRawTransaction(signed).do();

  await waitForConfirmation(algodClient, txId, 10);
  return txId;
}

// Helper: read and parse global state correctly
async function readGlobalState() {
  const info  = await algodClient.getApplicationByID(appId).do();
  const state = info.params["global-state"] || [];
  const result = { count: 0, items: [] };

  for (const kv of state) {
    const rawKey = Buffer.from(kv.key, "base64");
    const len    = rawKey.length;

    // Decode the value
    const val = kv.value.type === 1
      ? Buffer.from(kv.value.bytes, "base64").toString("utf8")
      : kv.value.uint;

    // Plain "Count" key has no 8-byte suffix
    if (rawKey.toString("utf8") === "Count") {
      result.count = Number(val);
      continue;
    }

    // Otherwise: last 8 bytes = big-endian index
    const idx = Number(rawKey.readBigUInt64BE(len - 8));
    // leading bytes = prefix plus underscore, e.g. "Name_"
    const prefixWithUS = rawKey.slice(0, len - 8).toString("utf8");
    const prefix = prefixWithUS.replace(/_$/, ""); // drop trailing underscore

    // Ensure slot exists
    result.items[idx] = result.items[idx] || { name: "", qty: "", category: "", note: "" };

    // Assign based on prefix
    if (prefix === "Name")     result.items[idx].name     = val;
    if (prefix === "Qty")      result.items[idx].qty      = val;
    if (prefix === "Category") result.items[idx].category = val;
    if (prefix === "Note")     result.items[idx].note     = val;
  }

  return result;
}

// GET /items — view all items
app.get("/items", async (_req, res) => {
  try {
    const state = await readGlobalState();
    res.json(state);
  } catch (err) {
    console.error("Failed to fetch items:", err);
    res.status(500).json({ error: "Unable to fetch items" });
  }
});

// POST /add — add a new item
// body: { name, qty, category, note }
app.post("/add", async (req, res) => {
  const { name, qty, category, note } = req.body;
  if (!name || !qty || !category) {
    return res.status(400).json({ error: "name, qty, and category are required" });
  }

  const args = [
    new Uint8Array(Buffer.from("Add")),
    new Uint8Array(Buffer.from(name)),
    new Uint8Array(Buffer.from(String(qty))),
    new Uint8Array(Buffer.from(category)),
    new Uint8Array(Buffer.from(note || ""))
  ];

  try {
    const txId = await callApp(args);
    console.log(`Add-item transaction ID:`, txId);
    const state = await readGlobalState();
    res.json({ txId, state });
  } catch (err) {
    console.error("Add failed:", err);
    res.status(500).json({ error: "Add transaction failed", details: err.toString() });
  }
});

// POST /update — update an existing item
// body: { index, name, qty, category, note }
app.post("/update", async (req, res) => {
  const { index, name, qty, category, note } = req.body;
  if (index == null || !name || !qty || !category) {
    return res.status(400).json({ error: "index, name, qty, and category are required" });
  }

  const args = [
    new Uint8Array(Buffer.from("Update")),
    algosdk.encodeUint64(Number(index)),
    new Uint8Array(Buffer.from(name)),
    new Uint8Array(Buffer.from(String(qty))),
    new Uint8Array(Buffer.from(category)),
    new Uint8Array(Buffer.from(note || ""))
  ];

  try {
    const txId = await callApp(args);
    console.log(`Update-item transaction ID:`, txId);
    const state = await readGlobalState();
    res.json({ txId, state });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: "Update transaction failed", details: err.toString() });
  }
});

// POST /remove — remove an item by index
// body: { index }
app.post("/remove", async (req, res) => {
  const { index } = req.body;
  if (index == null) {
    return res.status(400).json({ error: "index is required" });
  }

  const args = [
    new Uint8Array(Buffer.from("Remove")),
    algosdk.encodeUint64(Number(index))
  ];

  try {
    const txId = await callApp(args);
    console.log(`Remove-item transaction ID:`, txId);
    const state = await readGlobalState();
    res.json({ txId, state });
  } catch (err) {
    console.error("Remove failed:", err);
    res.status(500).json({ error: "Remove transaction failed", details: err.toString() });
  }
});

// POST /clear — clear all items
app.post("/clear", async (_req, res) => {
  try {
    const txId = await callApp([ new Uint8Array(Buffer.from("ClearAll")) ]);
    console.log(`Clear all-item transaction ID:`, txId);
    const state = await readGlobalState();
    res.json({ txId, state });
  } catch (err) {
    console.error("ClearAll failed:", err);
    res.status(500).json({ error: "ClearAll transaction failed", details: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log(` ShoppingList API listening on http://localhost:${PORT}`);
});
