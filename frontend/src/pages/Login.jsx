// frontend/src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, ArrowLeft, Lock, Mail } from "lucide-react";

export default function Login() {
  const { session, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Leaf size={24} />
            </span>
            <span className="font-bold text-2xl text-gray-900 tracking-tight">
              agri<span className="text-emerald-600">choice</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Staff & Admin Portal</h1>
          <p className="text-sm text-gray-500">Sign in to manage inventory, counter sales, and orders</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agrichoice.com"
                  required
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? "Signing in..." : "Sign in to Dashboard"}
            </button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2 text-center">Quick Demo Login:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("staff@agrichoice.com", "StaffPassword123!")}
                className="px-2 py-1.5 border rounded text-xs text-gray-700 hover:bg-gray-50 transition text-center"
              >
                <strong>Staff User</strong>
                <span className="block text-[10px] text-gray-400">Inventory & Orders</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@agrichoice.com", "AdminPassword123!")}
                className="px-2 py-1.5 border rounded text-xs text-gray-700 hover:bg-gray-50 transition text-center"
              >
                <strong>Admin User</strong>
                <span className="block text-[10px] text-gray-400">Full + Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
          >
            <ArrowLeft size={16} />
            <span>Return to Public Catalog</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
