// server.js
import express from "express";
import dotenv from "dotenv";
import algosdk from "algosdk";

dotenv.config();

const app    = express();
const PORT   = process.env.PORT || 3000;

// parse JSON bodies
app.use(express.json());

// ── Algorand client setup ────────────────────────────────────────────────────
const BASE_SERVER = process.env.BASE_SERVER || "https://testnet-api.algonode.cloud";
const algodClient = new algosdk.Algodv2("", BASE_SERVER, "");

// recover your account
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("MNEMONIC not set in .env");
  process.exit(1);
}
const { addr: sender, sk } = algosdk.mnemonicToSecretKey(mnemonic);

// your deployed App ID
const appId = Number(process.env.SHOPPINGLIST_APP_ID);
if (!appId) {
  console.error("SHOPPINGLIST_APP_ID not set in .env");
  process.exit(1);
}

// ── Helper: read & decode global state ───────────────────────────────────────
async function readGlobalState() {
  const info = await algodClient.getApplicationByID(appId).do();
  const state = info.params["global-state"] || [];
  const list  = [];
  let count   = 0;

  state.forEach(kv => {
    const keyBuf = Buffer.from(kv.key, "base64");
    const keyStr = keyBuf.toString("ascii", 0, 5); // "Item_"
    const suffix = keyBuf.length > 5
      ? keyBuf.slice(5).reduce((a,b)=>a*256+b,0)
      : null;

    if (keyStr === "Item_" && suffix !== null) {
      const val = kv.value.type === 1
        ? Buffer.from(kv.value.bytes,"base64").toString()
        : kv.value.uint;
      list[suffix] = val;
    } else if (kv.key === Buffer.from("Count").toString("base64")) {
      count = kv.value.uint;
    }
  });

  return { count, list };
}

// ── GET /state ───────────────────────────────────────────────────────────────
app.get("/state", async (req, res) => {
  try {
    const { count, list } = await readGlobalState();
    res.json({ count, list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /add { item: string } ───────────────────────────────────────────────
app.post("/add", async (req, res) => {
  try {
    const { item } = req.body;
    if (!item || typeof item !== "string") {
      return res.status(400).json({ error: "'item' must be a non-empty string" });
    }

    const params = await algodClient.getTransactionParams().do();
    const args   = [
      new Uint8Array(Buffer.from("Add")),         // method
      new Uint8Array(Buffer.from(item))           // item bytes
    ];
    const txn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, args);
    const signed = txn.signTxn(sk);
    const txId   = txn.txID().toString();

    await algodClient.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    const state = await readGlobalState();
    res.json({ txId, state });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /remove { index: number } ────────────────────────────────────────────
app.post("/remove", async (req, res) => {
  try {
    const { index } = req.body;
    if (typeof index !== "number" || index < 0) {
      return res.status(400).json({ error: "'index' must be a non-negative integer" });
    }

    const params = await algodClient.getTransactionParams().do();
    const args   = [
      new Uint8Array(Buffer.from("Remove")),      // method
      algosdk.encodeUint64(index)                 // correctly encode integer
    ];
    const txn    = algosdk.makeApplicationNoOpTxn(sender, params, appId, args);
    const signed = txn.signTxn(sk);
    const txId   = txn.txID().toString();

    await algodClient.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);

    const state = await readGlobalState();
    res.json({ txId, state });

  } catch (err) {
    console.error(err);
    // if assertion failed in TEAL, it’ll bubble up here
    res.status(400).json({ error: err.message });
  }
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 ShoppingList backend running at http://localhost:${PORT}`);
});
