import { startTransition, useEffect, useOptimistic, useState } from "react";
import { contactsApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ContactForm from "../components/ContactForm.jsx";

export default function Contacts() {
  document.title = "Contacts · Contact List";
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [optimisticContacts, applyOptimistic] = useOptimistic(contacts, (state, action) => {
    if (action.type === "add") return [...state, action.contact];
    if (action.type === "remove") return state.filter((c) => c.id !== action.id);
    if (action.type === "update")
      return state.map((c) => (c.id === action.contact.id ? action.contact : c));
    return state;
  });

  useEffect(() => {
    contactsApi
      .list(token)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAdd(contact) {
    const tempId = `temp-${Date.now()}`;
    applyOptimistic({ type: "add", contact: { ...contact, id: tempId } });
    const created = await contactsApi.create(token, contact);
    setContacts((prev) => [...prev, created]);
    setShowAdd(false);
  }

  async function handleUpdate(id, contact) {
    applyOptimistic({ type: "update", contact: { ...contact, id } });
    const updated = await contactsApi.update(token, id, contact);
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  }

  function handleDelete(id) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      await contactsApi.remove(token, id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Contacts</h1>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            + Add contact
          </button>
        )}
      </div>

      {showAdd && (
        <ContactForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} submitLabel="Add" />
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : optimisticContacts.length === 0 ? (
        <p className="text-slate-500">No contacts yet.</p>
      ) : (
        <ul className="space-y-3">
          {optimisticContacts.map((c) =>
            editingId === c.id ? (
              <ContactForm
                key={c.id}
                initial={c}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={(contact) => handleUpdate(c.id, contact)}
              />
            ) : (
              <li
                key={c.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between"
              >
                <div>
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.email}</p>
                  <p className="text-sm text-slate-500">{c.phone}</p>
                  {c.address && <p className="text-sm text-slate-500">{c.address}</p>}
                  {c.notes && <p className="text-sm text-slate-400 mt-1">{c.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(c.id)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}
