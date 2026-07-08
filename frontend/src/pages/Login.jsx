import { useActionState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  document.title = "Login · Contact List";
  const { login } = useAuth();
  const navigate = useNavigate();

  const [error, formAction, isPending] = useActionState(async (_prevError, formData) => {
    const email = formData.get("email");
    const password = formData.get("password");
    try {
      await login(email, password);
      navigate("/contacts");
      return null;
    } catch (err) {
      return err.message || "Login failed";
    }
  }, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form action={formAction} className="bg-white shadow-sm rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6 text-slate-800">Sign in</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <label className="block text-sm text-slate-600 mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <label className="block text-sm text-slate-600 mb-1">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md py-2 font-medium"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-slate-500 mt-4 text-center">
          No account?{" "}
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
