import React from "react";

export default function ItemList({ items, onEdit, onRemove, onClear }) {
  if (items.length === 0) {
    return (
      <>
        <p>No items yet.</p>
        <button onClick={onClear} disabled>Clear All</button>
      </>
    );
  }
  return (
    <>
      <table width="100%" border="1" cellPadding="6" style={{borderCollapse:"collapse", marginBottom:"1rem"}}>
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Qty</th><th>Category</th><th>Note</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{i}</td>
              <td>{it.name}</td>
              <td>{it.qty}</td>
              <td>{it.category}</td>
              <td>{it.note}</td>
              <td>
                <button onClick={() => onEdit(i)}>Edit</button>
                <button onClick={() => onRemove(i)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onClear}>Clear All</button>
    </>
  );
}
