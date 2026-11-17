// frontend/src/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import PublicHome from "./pages/PublicHome";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shop from "./pages/Shop";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import RequireAuth from "./components/RequireAuth";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Store Home */}
      <Route path="/" element={<PublicHome />} />

      {/* Staff / Admin Login */}
      <Route path="/login" element={<Login />} />

      {/* Protected Staff Dashboard */}
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="inventory" replace />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="shop" element={<Shop />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Catch-all redirect to public store */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
