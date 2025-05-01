// src/components/AddItemForm.jsx
import React, { useState } from "react";

export default function AddItemForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    name: "", qty: 1, category: "Produce", note: ""
  });
  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = e => {
    e.preventDefault();
    onAdd(form);
    setForm({ name: "", qty: 1, category: "Produce", note: "" });
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <label>
        Item Name
        <input
          name="name"
          placeholder="e.g. Organic Apples"
          value={form.name}
          onChange={handle}
          required
        />
      </label>
      <label>
        Quantity
        <input
          name="qty"
          type="number"
          min="1"
          value={form.qty}
          onChange={handle}
          required
        />
      </label>
      <label>
        Category
        <select name="category" value={form.category} onChange={handle}>
          <option>Produce</option>
          <option>Dairy</option>
          <option>Bakery</option>
          <option>Household</option>
          <option>Other</option>
        </select>
      </label>
      <label style={{ gridColumn: "1 / span 3" }}>
        Notes
        <textarea
          name="note"
          placeholder="Any special instructions…"
          value={form.note}
          onChange={handle}
        />
      </label>
      <button
        type="button"
        className="btn btn-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button type="submit" className="btn btn-add">
        Add Item
      </button>
    </form>
  );
}
