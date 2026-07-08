import { startTransition, useCallback, useEffect, useOptimistic, useState } from "react";
import { contactsApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ContactForm from "../components/ContactForm.jsx";

const PAGE_SIZE = 10;

export default function Contacts() {
  document.title = "Contacts · Contact List";
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [optimisticContacts, applyOptimistic] = useOptimistic(contacts, (state, action) => {
    if (action.type === "remove") return state.filter((c) => c.id !== action.id);
    if (action.type === "update")
      return state.map((c) => (c.id === action.contact.id ? action.contact : c));
    return state;
  });

  const loadPage = useCallback(
    (p) => {
      setLoading(true);
      return contactsApi.list(token, p, PAGE_SIZE).then((data) => {
        setContacts(data.items);
        setTotal(data.total);
        setPage(data.page);
        setLoading(false);
      });
    },
    [token]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleAdd(contact) {
    await contactsApi.create(token, contact);
    setShowAdd(false);
    await loadPage(Math.max(1, Math.ceil((total + 1) / PAGE_SIZE)));
  }

  async function handleUpdate(id, contact) {
    applyOptimistic({ type: "update", contact: { ...contact, id } });
    await contactsApi.update(token, id, contact);
    setEditingId(null);
    await loadPage(page);
  }

  function handleDelete(id) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      await contactsApi.remove(token, id);
      const isLastItemOnPage = contacts.length === 1 && page > 1;
      await loadPage(isLastItemOnPage ? page - 1 : page);
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
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

      {editingId && (
        <ContactForm
          initial={optimisticContacts.find((c) => c.id === editingId)}
          submitLabel="Save"
          onCancel={() => setEditingId(null)}
          onSubmit={(contact) => handleUpdate(editingId, contact)}
        />
      )}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : optimisticContacts.length === 0 ? (
        <p className="text-slate-500">No contacts yet.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Address</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {optimisticContacts.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2 text-slate-500">{c.email}</td>
                  <td className="px-4 py-2 text-slate-500">{c.phone}</td>
                  <td className="px-4 py-2 text-slate-500">{c.address}</td>
                  <td className="px-4 py-2 text-slate-400">{c.notes}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="space-x-2">
              <button
                onClick={() => loadPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => loadPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
