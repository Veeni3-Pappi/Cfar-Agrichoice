// src/pages/Orders.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Orders() {
  const { session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.access_token) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
        const branchId = session.user?.user_metadata?.branch_id;
        const url = branchId ? `${apiUrl}/orders?branch_id=${branchId}` : `${apiUrl}/orders`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to load orders");
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [session]);

  if (loading) return <p>Loading orders…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Orders</h2>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Receipt</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-2">{order.receipt_no}</td>
                <td className="p-2">{order.customer_name || order.customer_phone}</td>
                <td className="p-2">{order.total_amount}</td>
                <td className="p-2">{order.payment_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
