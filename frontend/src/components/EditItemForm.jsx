import React, { useState } from "react";

export default function EditItemForm({ index, item, onSave, onCancel }) {
  const [form, setForm] = useState({ ...item });
  const handle = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    onSave(index, form);
  };

  return (
    <form onSubmit={submit}>
      <h2>Edit Item #{index}</h2>
      <input name="name" placeholder="Name" value={form.name} onChange={handle} required />
      <input name="qty" placeholder="Quantity" value={form.qty} onChange={handle} required />
      <input name="category" placeholder="Category" value={form.category} onChange={handle} required />
      <textarea name="note" placeholder="Note" value={form.note} onChange={handle} />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}
