// src/components/EditItemForm.jsx
import React, { useState } from "react";

export default function EditItemForm({ index, item, onSave, onCancel }) {
  const [form, setForm] = useState({ ...item });
  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = e => {
    e.preventDefault();
    onSave(index, form);
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <label>
        Item Name
        <input
          name="name"
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
        <select
          name="category"
          value={form.category}
          onChange={handle}
        >
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
        Save
      </button>
    </form>
  );
}
