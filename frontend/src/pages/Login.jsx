// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="rounded bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold">Staff Login</h2>
        {error && <p className="mb-2 text-red-600">{error}</p>}
        <div className="mb-3">
          <label className="block text-sm" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-2 py-1"
          />
        </div>
        <button type="submit" className="w-full rounded bg-blue-600 py-2 text-white">
          Sign in
        </button>
      </form>
    </div>
  );
}
