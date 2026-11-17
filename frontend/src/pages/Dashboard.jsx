// src/pages/Dashboard.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { session, logout } = useAuth();
  const role = session?.user?.app_metadata?.role || "staff";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <nav className="w-64 bg-white border-r p-4 space-y-2">
        <h2 className="text-lg font-semibold mb-4">Staff Dashboard</h2>
        <NavLink
          to="/dashboard/shop"
          className={({ isActive }) =>
            isActive ? "block py-2 px-3 bg-blue-100 rounded" : "block py-2 px-3 rounded hover:bg-gray-100"
          }
        >
          Shop
        </NavLink>
        <NavLink
          to="/dashboard/inventory"
          className={({ isActive }) =>
            isActive ? "block py-2 px-3 bg-blue-100 rounded" : "block py-2 px-3 rounded hover:bg-gray-100"
          }
        >
          Inventory
        </NavLink>
        <NavLink
          to="/dashboard/orders"
          className={({ isActive }) =>
            isActive ? "block py-2 px-3 bg-blue-100 rounded" : "block py-2 px-3 rounded hover:bg-gray-100"
          }
        >
          Orders
        </NavLink>
        {role === "admin" && (
          <NavLink
            to="/dashboard/reports"
            className={({ isActive }) =>
              isActive ? "block py-2 px-3 bg-blue-100 rounded" : "block py-2 px-3 rounded hover:bg-gray-100"
            }
          >
            Reports
          </NavLink>
        )}
        <button
          onClick={logout}
          className="mt-8 w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Sign Out
        </button>
      </nav>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
