// src/components/RequireAuth.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
