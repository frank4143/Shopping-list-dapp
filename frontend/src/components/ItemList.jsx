// src/components/ItemList.jsx
import React from "react";

export default function ItemList({ items, onEdit, onRemove }) {
  if (!items.length) {
    return (
      <p style={{
        textAlign: "center",
        color: "var(--stone)",
        padding: "2rem 0"
      }}>
        Your cart is looking light 🛍️
      </p>
    );
  }
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Item</th>
          <th>Category</th>
          <th>Qty</th>
          <th>Note</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td><input type="checkbox"/></td>
            <td>{it.name}</td>
            <td><span className="category-badge">{it.category}</span></td>
            <td>{it.qty}</td>
            <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
              {it.note}
            </td>
            <td className="actions">
              <button onClick={() => onEdit(i)} title="Edit">✏️</button>
              <button onClick={() => onRemove(i)} title="Delete">🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
