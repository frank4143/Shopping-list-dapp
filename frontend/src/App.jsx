// src/App.jsx
import React, { useEffect, useState } from "react";
import { getItems, addItem, updateItem, removeItem, clearAll } from "./api";
import ListPage from "./pages/ListPage";
import AddPage from "./pages/AddPage";

export default function App() {
  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [lastTxId, setLastTxId] = useState("");

  const load = async () => {
    const { items = [] } = await getItems();
    setItems(items);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async item => {
    const { txId = "" } = await addItem(item);
    setLastTxId(txId);
    await load();
    setShowAdd(false);
  };

  const handleUpdate = async (i, item) => {
    const { txId = "" } = await updateItem(i, item);
    setLastTxId(txId);
    setEditingIndex(null);
    await load();
  };

  const handleRemove = async i => {
    const { txId = "" } = await removeItem(i);
    setLastTxId(txId);
    await load();
  };

  const handleClear = async () => {
    const { txId = "" } = await clearAll();
    setLastTxId(txId);
    await load();
  };

  return (
    <div className="container">
      <h1>EverCart</h1>
      <p className="subtitle">Your mindful grocery companion</p>
      {lastTxId && <div className="txid">Last Transaction ID: {lastTxId}</div>}
      <button className="clear-all" onClick={handleClear}>Clear All</button>

      {showAdd ? (
        <AddPage onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      ) : editingIndex != null ? (
        <ListPage
          items={items}
          editingIndex={editingIndex}
          onEdit={setEditingIndex}
          onRemove={handleRemove}
          onSave={handleUpdate}
          onCancel={() => setEditingIndex(null)}
        />
      ) : (
        <ListPage
          items={items}
          onEdit={setEditingIndex}
          onRemove={handleRemove}
        />
      )}

      <div className="action-box">
        <button
          className="btn btn-list"
          onClick={() => { setShowAdd(false); setEditingIndex(null); }}
        >
          View List
        </button>
        <button
          className="btn btn-add"
          onClick={() => { setShowAdd(true); setEditingIndex(null); }}
        >
          Add Item
        </button>
        <button className="btn btn-delete" onClick={handleClear}>
          Clear All
        </button>
      </div>
    </div>
  );
}
