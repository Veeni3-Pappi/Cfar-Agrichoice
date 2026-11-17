// frontend/src/pages/Orders.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../components/Catalog";
import { ShoppingBag, TrendingUp, Calendar, MapPin, Search, FileText } from "lucide-react";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function Orders() {
  const { session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total_revenue: 0, total_orders: 0, daily_revenue: 0 });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    async function loadBranches() {
      try {
        const response = await fetch(`${API_URL}/branches`);
        if (response.ok) {
          const list = await response.json();
          setBranches(list);
        }
      } catch {
        // ignore
      }
    }
    loadBranches();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_URL}/orders`);
      if (selectedBranch) {
        url.searchParams.set("branch_id", selectedBranch);
      }

      const headers = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) throw new Error("Failed to load orders.");
      const data = await response.json();

      setOrders(data.orders || []);
      setSummary({
        total_revenue: data.total_revenue || 0,
        total_orders: data.total_orders || 0,
        daily_revenue: data.daily_revenue || 0,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [selectedBranch, session]);

  async function viewReceipt(receiptNo) {
    try {
      const response = await fetch(`${API_URL}/orders/${receiptNo}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedReceipt(data);
      }
    } catch {
      // ignore
    }
  }

  const filteredOrders = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      o.receipt_no?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.branch_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">Order History & Sales</h2>
          <p className="text-gray-500 text-sm">
            Review customer purchases, receipts, and payment statuses across branches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-gray-500" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="border rounded px-3 py-1.5 bg-white font-medium shadow-sm text-sm"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 border rounded px-3 py-1.5 bg-white shadow-sm text-sm">
            <Search size={16} className="text-gray-400" />
            <input
              type="search"
              placeholder="Search receipt / customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="outline-none text-sm"
            />
          </label>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Total Sales Revenue</span>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {loading ? "..." : formatPrice(summary.total_revenue)}
          </p>
          <span className="text-xs text-gray-400">All completed orders</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Total Orders Count</span>
            <ShoppingBag size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : summary.total_orders}</p>
          <span className="text-xs text-gray-400">Recorded transactions</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Today's Revenue</span>
            <Calendar size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : formatPrice(summary.daily_revenue)}</p>
          <span className="text-xs text-gray-400">Past 24 hours</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Transactions List</h3>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500 text-center">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">No orders match your filter criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => {
                  const isDone = order.payment_status === "completed";
                  const isPending = order.payment_status === "pending";
                  return (
                    <tr key={order.order_id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono font-medium">{order.receipt_no}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-gray-800">
                          {order.customer_name || "Walk-in customer"}
                        </span>
                        <div className="text-xs text-gray-400">{order.customer_phone}</div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{order.branch_name}</td>
                      <td className="py-2.5 px-3 text-gray-500 text-xs">
                        {order.order_date
                          ? new Date(order.order_date).toLocaleString("en-KE", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{formatPrice(order.total_amount)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                            isDone
                              ? "bg-emerald-100 text-emerald-700"
                              : isPending
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => viewReceipt(order.receipt_no)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <FileText size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="receipt-modal" role="dialog" aria-modal="true">
          <div className="receipt-card">
            <div className="receipt-header">
              <div>
                <p className="section-kicker">Receipt Breakdown</p>
                <h3>{selectedReceipt.receipt_no}</h3>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setSelectedReceipt(null)}
              >
                ×
              </button>
            </div>

            <div className="receipt-meta">
              <span>{selectedReceipt.branch?.branch_name} ({selectedReceipt.branch?.location})</span>
              <span>
                {new Date(selectedReceipt.order_date || Date.now()).toLocaleString("en-KE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="text-xs text-gray-600 mb-3">
              Customer: <strong>{selectedReceipt.customer?.full_name || "Walk-in"}</strong> (
              {selectedReceipt.customer?.phone})
            </div>

            <div className="receipt-items">
              {selectedReceipt.items?.map((item) => (
                <div key={item.product_id} className="receipt-line">
                  <span>
                    {item.product_name} × {item.quantity} {item.unit}
                  </span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div className="receipt-total">
              <span>Total Paid</span>
              <strong>{formatPrice(selectedReceipt.total_amount)}</strong>
            </div>

            <div className="receipt-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
