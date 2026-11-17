// frontend/src/pages/Reports.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../components/Catalog";
import { BarChart3, DollarSign, CreditCard, Store, Printer } from "lucide-react";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function Reports() {
  const { session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
        const [ordersRes, branchesRes] = await Promise.all([
          fetch(`${API_URL}/orders`, { headers }),
          fetch(`${API_URL}/branches`),
        ]);

        if (!ordersRes.ok) throw new Error("Could not load sales report data.");
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);

        if (branchesRes.ok) {
          const branchesData = await branchesRes.json();
          setBranches(branchesData || []);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session]);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const completedOrders = orders.filter((o) => o.payment_status === "completed");
  const completedRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? completedRevenue / completedOrders.length : 0;

  // Revenue by branch
  const branchMap = {};
  branches.forEach((b) => {
    branchMap[b.branch_id] = { name: b.branch_name, revenue: 0, count: 0 };
  });

  orders.forEach((o) => {
    if (branchMap[o.branch_id]) {
      branchMap[o.branch_id].revenue += Number(o.total_amount || 0);
      branchMap[o.branch_id].count += 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            Executive Sales & Analytics Report
          </h2>
          <p className="text-gray-500 text-sm">
            High-level business performance, revenue trends, and branch breakdown.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3 py-1.5 border rounded bg-white hover:bg-gray-50 shadow-sm text-sm font-medium transition"
        >
          <Printer size={16} />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Gross Revenue</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {loading ? "..." : formatPrice(completedRevenue)}
          </p>
          <span className="text-xs text-gray-400">Completed sales</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Total Orders</span>
            <BarChart3 size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : orders.length}</p>
          <span className="text-xs text-gray-400">{completedOrders.length} completed</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Average Order Value</span>
            <CreditCard size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : formatPrice(avgOrderValue)}</p>
          <span className="text-xs text-gray-400">Per transaction</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Active Branches</span>
            <Store size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : branches.length}</p>
          <span className="text-xs text-gray-400">Retail & farms</span>
        </div>
      </div>

      {/* Branch Performance Breakdown */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-lg mb-3">Branch Performance Breakdown</h3>
        {loading ? (
          <p className="py-6 text-center text-gray-500">Loading branch statistics...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="py-2.5 px-3">Branch Name</th>
                  <th className="py-2.5 px-3">Orders Count</th>
                  <th className="py-2.5 px-3">Total Sales</th>
                  <th className="py-2.5 px-3">% of Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.values(branchMap).map((b, i) => {
                  const share = totalRevenue > 0 ? (b.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium">{b.name}</td>
                      <td className="py-2.5 px-3">{b.count}</td>
                      <td className="py-2.5 px-3 font-semibold">{formatPrice(b.revenue)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
