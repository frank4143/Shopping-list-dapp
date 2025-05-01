// src/pages/ListPage.jsx
import React from "react";
import ItemList from "../components/ItemList";
import EditItemForm from "../components/EditItemForm";

export default function ListPage({
  items, editingIndex, onEdit, onRemove, onSave, onCancel
}) {
  return editingIndex != null ? (
    <EditItemForm
      index={editingIndex}
      item={items[editingIndex]}
      onSave={onSave}
      onCancel={onCancel}
    />
  ) : (
    <ItemList items={items} onEdit={onEdit} onRemove={onRemove} />
  );
}
