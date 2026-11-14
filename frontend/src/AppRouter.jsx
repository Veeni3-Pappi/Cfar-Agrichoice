// src/AppRouter.jsx
import { Routes, Route, Navigate } from "react-router-dom";
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
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="shop" replace />} />
        <Route path="shop" element={<Shop />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      {/* Fallback to login if route not found */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
