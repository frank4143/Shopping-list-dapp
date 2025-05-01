// src/pages/AddPage.jsx
import React from "react";
import AddItemForm from "../components/AddItemForm";

export default function AddPage({ onAdd, onCancel }) {
  return <AddItemForm onAdd={onAdd} onCancel={onCancel} />;
}
