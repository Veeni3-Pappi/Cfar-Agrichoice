// src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Inventory() {
  const { session } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.access_token) return;
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/inventory/${session.user.user_metadata.branch_id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to load inventory");
        const data = await response.json();
        setInventory(data.inventory || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [session]);

  if (loading) return <p>Loading inventory…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Branch Inventory</h2>
      {inventory.length === 0 ? (
        <p>No inventory records found.</p>
      ) : (
        <table className="w-full table-auto border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Quantity</th>
              <th className="p-2 text-left">Alert</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.product_name}</td>
                <td className="p-2">{item.stock_quantity}</td>
                <td className="p-2">{item.alert_threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
