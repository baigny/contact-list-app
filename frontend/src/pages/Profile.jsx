import { useActionState } from "react";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  document.title = "Profile · Contact List";
  const { token, user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(async (_prev, formData) => {
    const update = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
    };
    try {
      const updated = await usersApi.update(token, user.id, update);
      setUser(updated);
      return { success: "Profile updated" };
    } catch (err) {
      return { error: err.message || "Update failed" };
    }
  }, {});

  async function handleDelete() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    await usersApi.remove(token, user.id);
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-4">Profile</h1>
      <form action={formAction} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        {state.error && <p className="text-red-600 text-sm">{state.error}</p>}
        {state.success && <p className="text-green-600 text-sm">{state.success}</p>}
        <div>
          <label className="block text-sm text-slate-600 mb-1">Full name</label>
          <input
            name="full_name"
            defaultValue={user.full_name}
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-sm text-slate-400">Role: {user.is_admin ? "Admin" : "User"}</p>
        <button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
      <button
        onClick={handleDelete}
        className="mt-4 text-sm text-red-600 hover:underline"
      >
        Delete my account
      </button>
    </div>
  );
}
