import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-indigo-600">Contact List</span>
        <Link to="/contacts" className="text-slate-600 hover:text-indigo-600">
          Contacts
        </Link>
        <Link to="/profile" className="text-slate-600 hover:text-indigo-600">
          Profile
        </Link>
        {user.is_admin && (
          <Link to="/users" className="text-slate-600 hover:text-indigo-600">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">{user.full_name}</span>
        <button
          onClick={handleLogout}
          className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
