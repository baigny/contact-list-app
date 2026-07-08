import { useEffect, useState } from "react";
import { usersApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminUsers() {
  document.title = "Users · Contact List";
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    usersApi
      .list(token)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function toggleAdmin(u) {
    const updated = await usersApi.update(token, u.id, { is_admin: !u.is_admin });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  }

  async function removeUser(u) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    await usersApi.remove(token, u.id);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Users</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-left text-sm text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2">{u.is_admin ? "Admin" : "User"}</td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => toggleAdmin(u)}
                    disabled={u.id === currentUser.id}
                    className="text-sm text-indigo-600 hover:underline disabled:opacity-30 disabled:no-underline"
                  >
                    {u.is_admin ? "Revoke admin" : "Make admin"}
                  </button>
                  <button
                    onClick={() => removeUser(u)}
                    disabled={u.id === currentUser.id}
                    className="text-sm text-red-600 hover:underline disabled:opacity-30 disabled:no-underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
