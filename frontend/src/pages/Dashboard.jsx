// frontend/src/pages/Dashboard.jsx
import { NavLink, Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShoppingBag,
  Package,
  FileText,
  BarChart3,
  ExternalLink,
  LogOut,
  Leaf,
  UserCheck,
} from "lucide-react";

export default function Dashboard() {
  const { session, logout } = useAuth();
  const role = session?.user?.app_metadata?.role || "staff";
  const email = session?.user?.email || "staff@agrichoice.com";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between p-4 shadow-sm">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-2 mb-6 px-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
              <Leaf size={20} />
            </span>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              agri<span className="text-emerald-600">choice</span>
            </span>
          </div>

          {/* User profile card */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg border text-xs text-gray-600">
            <div className="flex items-center gap-1.5 font-semibold text-gray-800 mb-0.5">
              <UserCheck size={14} className="text-emerald-600" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="capitalize text-gray-500">Role:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                  role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <NavLink
              to="/dashboard/inventory"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-sm transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Package size={18} />
              <span>Inventory & Restock</span>
            </NavLink>

            <NavLink
              to="/dashboard/orders"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-sm transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <FileText size={18} />
              <span>Orders & Sales</span>
            </NavLink>

            <NavLink
              to="/dashboard/shop"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-sm transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <ShoppingBag size={18} />
              <span>Counter POS / Catalog</span>
            </NavLink>

            {role === "admin" && (
              <NavLink
                to="/dashboard/reports"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md font-medium text-sm transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <BarChart3 size={18} />
                <span>Executive Reports</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition"
          >
            <ExternalLink size={16} />
            <span>Public Store View</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
