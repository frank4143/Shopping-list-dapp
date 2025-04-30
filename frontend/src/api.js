const API = process.env.REACT_APP_API_URL;

export async function getItems() {
  const res = await fetch(`${API}/items`);
  return res.json();
}

export async function addItem(item) {
  const res = await fetch(`${API}/add`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(item)
  });
  return res.json();
}

export async function updateItem(index, item) {
  const res = await fetch(`${API}/update`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ index, ...item })
  });
  return res.json();
}

export async function removeItem(index) {
  const res = await fetch(`${API}/remove`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ index })
  });
  return res.json();
}

export async function clearAll() {
  const res = await fetch(`${API}/clear`, {
    method: "POST"
  });
  return res.json();
}
