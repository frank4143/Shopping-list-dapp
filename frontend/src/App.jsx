import React, { useEffect, useState } from "react";
import { getItems, addItem, updateItem, removeItem, clearAll } from "./api";
import ItemList from "./components/ItemList";
import AddItemForm from "./components/AddItemForm";
import EditItemForm from "./components/EditItemForm";

export default function App() {
  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastTxId, setLastTxId] = useState(""); // new state for txID

  const load = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data.items || []);
    } catch (err) {
      setError("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (item) => {
    try {
      const { txId } = await addItem(item);
      console.log("Add transaction ID:", txId);
      setLastTxId(txId);
      await load();
    } catch (err) {
      setError("Add failed");
    }
  };

  const handleUpdate = async (index, item) => {
    try {
      const { txId } = await updateItem(index, item);
      console.log("Update transaction ID:", txId);
      setLastTxId(txId);
      setEditingIndex(null);
      await load();
    } catch (err) {
      setError("Update failed");
    }
  };

  const handleRemove = async (index) => {
    try {
      const { txId } = await removeItem(index);
      console.log("Remove transaction ID:", txId);
      setLastTxId(txId);
      await load();
    } catch (err) {
      setError("Remove failed");
    }
  };

  const handleClear = async () => {
    try {
      const { txId } = await clearAll();
      console.log("Clear transaction ID:", txId);
      setLastTxId(txId);
      await load();
    } catch (err) {
      setError("Clear failed");
    }
  };

  return (
    <div className="container">
      <h1>Shopping List</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* Display last transaction ID */}
      {lastTxId && (
        <div style={{ margin: "1rem 0", fontStyle: "italic" }}>
          Last transaction ID: <code>{lastTxId}</code>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <ItemList
            items={items}
            onEdit={setEditingIndex}
            onRemove={handleRemove}
            onClear={handleClear}
          />

          {editingIndex != null ? (
            <EditItemForm
              index={editingIndex}
              item={items[editingIndex]}
              onSave={handleUpdate}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <AddItemForm onAdd={handleAdd} />
          )}
        </>
      )}
    </div>
  );
}
