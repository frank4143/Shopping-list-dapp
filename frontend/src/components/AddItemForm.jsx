import React, { useState } from "react";

export default function AddItemForm({ onAdd }) {
  const [form, setForm] = useState({ name:"", qty:"", category:"", note:"" });
  const handle = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    onAdd(form);
    setForm({ name:"", qty:"", category:"", note:"" });
  };

  return (
    <form onSubmit={submit}>
      <h2>Add New Item</h2>
      <input name="name" placeholder="Name" value={form.name} onChange={handle} required />
      <input name="qty" placeholder="Quantity" value={form.qty} onChange={handle} required />
      <input name="category" placeholder="Category" value={form.category} onChange={handle} required />
      <textarea name="note" placeholder="Note" value={form.note} onChange={handle} />
      <button type="submit">Add</button>
    </form>
  );
}
