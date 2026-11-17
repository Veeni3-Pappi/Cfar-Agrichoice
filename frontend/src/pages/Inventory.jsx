// frontend/src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MapPin, Package, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function Inventory() {
  const { session } = useAuth();
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [restockForm, setRestockForm] = useState({
    productId: "",
    quantity: "5",
    source: "harvested",
    recordedBy: "",
  });
  const [restockState, setRestockState] = useState({ loading: false, error: "", success: "" });

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const response = await fetch(`${API_URL}/branches`);
        if (!response.ok) throw new Error("Could not load branches.");
        const branchList = await response.json();
        setBranches(branchList);
        if (branchList.length > 0) {
          const userBranch =
            session?.user?.app_metadata?.branch_id ||
            session?.user?.user_metadata?.branch_id;
          const initial = branchList.find(b => String(b.branch_id) === String(userBranch)) || branchList[0];
          setBranchId(String(initial.branch_id));
        }
      } catch (e) {
        setError(e.message);
      }
    }
    loadBranches();
  }, [session]);

  // Load inventory and products for selected branch
  async function fetchBranchData(bId) {
    if (!bId) return;
    setLoading(true);
    setError("");
    try {
      const [invRes, prodRes] = await Promise.all([
        fetch(`${API_URL}/inventory/${bId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        }),
        fetch(`${API_URL}/products?branch_id=${bId}`),
      ]);

      if (!invRes.ok) throw new Error("Could not load branch inventory.");
      const invData = await invRes.json();
      setInventory(invData.inventory || []);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (branchId) {
      fetchBranchData(branchId);
    }
  }, [branchId]);

  async function handleRestock(event) {
    event.preventDefault();

    if (!restockForm.productId) {
      setRestockState({ loading: false, error: "Please select a product to restock.", success: "" });
      return;
    }

    const quantity = Number(restockForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setRestockState({ loading: false, error: "Quantity must be greater than zero.", success: "" });
      return;
    }

    setRestockState({ loading: true, error: "", success: "" });

    try {
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${API_URL}/inventory/restock`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          branch_id: Number(branchId),
          product_id: Number(restockForm.productId),
          quantity,
          source: restockForm.source,
          recorded_by: restockForm.recordedBy ? Number(restockForm.recordedBy) : null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Restock failed.");
      }

      setRestockState({
        loading: false,
        error: "",
        success: `${result.inventory?.product_name || "Product"} restocked successfully!`,
      });

      setRestockForm({
        productId: "",
        quantity: "5",
        source: "harvested",
        recordedBy: "",
      });

      await fetchBranchData(branchId);
    } catch (e) {
      setRestockState({ loading: false, error: e.message, success: "" });
    }
  }

  const lowStockCount = inventory.filter(
    (item) => Number(item.stock_quantity || 0) <= Number(item.alert_threshold || 0)
  ).length;

  const totalUnits = inventory.reduce(
    (sum, item) => sum + Number(item.stock_quantity || 0),
    0
  );

  const selectedBranch = branches.find((b) => String(b.branch_id) === branchId);

  return (
    <div className="space-y-6">
      {/* Header & Branch Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">Branch Inventory Management</h2>
          <p className="text-gray-500 text-sm">
            Track current stock levels and record incoming harvests or acquisitions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-gray-500" />
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border rounded px-3 py-1.5 bg-white font-medium shadow-sm"
          >
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name} ({b.location})
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchBranchData(branchId)}
            className="p-2 border rounded hover:bg-gray-100 transition"
            title="Refresh inventory"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Total Units in Stock</span>
            <Package size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : totalUnits}</p>
          <span className="text-xs text-gray-400">{selectedBranch?.branch_name}</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Low Stock Alerts</span>
            <AlertTriangle size={18} className={lowStockCount > 0 ? "text-amber-500" : "text-gray-400"} />
          </div>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-amber-600" : ""}`}>
            {loading ? "..." : lowStockCount}
          </p>
          <span className="text-xs text-gray-400">Needs replenishment</span>
        </div>

        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm mb-1">
            <span>Tracked Products</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{loading ? "..." : inventory.length}</p>
          <span className="text-xs text-gray-400">Catalog active</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {/* Grid: Inventory Table + Restock Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-lg mb-3">Current Stock Levels</h3>
          {loading ? (
            <p className="text-gray-500 py-6 text-center">Loading stock data...</p>
          ) : inventory.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">No inventory found for this branch.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Stock</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Threshold</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inventory.map((item) => {
                    const isLow = Number(item.stock_quantity || 0) <= Number(item.alert_threshold || 0);
                    const isOut = Number(item.stock_quantity || 0) === 0;
                    return (
                      <tr key={item.product_id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium">{item.product_name}</td>
                        <td className="py-2.5 px-3 capitalize text-gray-500">{item.product_type}</td>
                        <td className="py-2.5 px-3 font-semibold">{item.stock_quantity}</td>
                        <td className="py-2.5 px-3 text-gray-500">{item.unit}</td>
                        <td className="py-2.5 px-3 text-gray-500">{item.alert_threshold}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                              isOut
                                ? "bg-red-100 text-red-700"
                                : isLow
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isOut ? "Sold out" : isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Restock Form */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-lg mb-2">Record Stock Intake</h3>
          <p className="text-xs text-gray-500 mb-4">
            Add harvested or acquired produce into branch stock.
          </p>

          <form onSubmit={handleRestock} className="space-y-3 text-sm">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Product</label>
              <select
                value={restockForm.productId}
                onChange={(e) => setRestockForm({ ...restockForm, productId: e.target.value })}
                className="w-full border rounded px-3 py-1.5 bg-white"
                required
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                step="any"
                value={restockForm.quantity}
                onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                className="w-full border rounded px-3 py-1.5"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Source</label>
              <select
                value={restockForm.source}
                onChange={(e) => setRestockForm({ ...restockForm, source: e.target.value })}
                className="w-full border rounded px-3 py-1.5 bg-white"
              >
                <option value="harvested">Harvested from farm</option>
                <option value="acquired">Acquired from supplier</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Recorded By Staff ID (optional)</label>
              <input
                type="number"
                min="1"
                value={restockForm.recordedBy}
                onChange={(e) => setRestockForm({ ...restockForm, recordedBy: e.target.value })}
                placeholder="Staff ID"
                className="w-full border rounded px-3 py-1.5"
              />
            </div>

            {restockState.error && (
              <p className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-200">
                {restockState.error}
              </p>
            )}

            {restockState.success && (
              <p className="text-emerald-700 text-xs bg-emerald-50 p-2 rounded border border-emerald-200">
                {restockState.success}
              </p>
            )}

            <button
              type="submit"
              disabled={restockState.loading}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition disabled:opacity-50"
            >
              {restockState.loading ? "Recording..." : "Record Intake & Update Stock"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
