"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  unit: string;
  opening_stock: number;
  current_stock: number;
  purchase_rate: number;
  selling_rate: number;
  min_stock: number;
};

export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    unit: "KG",
    opening_stock: "",
    purchase_rate: "",
    min_stock: "",
  });

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Product name required");
      return;
    }

    const openingStock = Number(form.opening_stock) || 0;

    const { error } = await supabase.from("products").insert({
      name: form.name.trim(),
      unit: form.unit,
      opening_stock: openingStock,
      current_stock: openingStock,
      purchase_rate: Number(form.purchase_rate) || 0,
      min_stock: Number(form.min_stock) || 0,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      name: "",
      unit: "KG",
      opening_stock: "",
      purchase_rate: "",
        min_stock: "",
    });

    setShowForm(false);
    loadProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadProducts();
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.current_stock || 0),
    0
  );

  const lowStock = products.filter(
    (product) =>
      Number(product.current_stock) <= Number(product.min_stock)
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 lg:p-8">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <a
            href="/"
            className="text-sm font-medium text-green-700"
          >
            ← Dashboard
          </a>

          <h1 className="mt-2 text-3xl font-bold">
            Products & Stock
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage products, inventory and pricing
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-green-700"
        >
          + Add Product
        </button>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Products</p>
          <p className="mt-2 text-2xl font-bold">{products.length}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Stock</p>
          <p className="mt-2 text-2xl font-bold">
            {totalStock.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Low Stock</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {lowStock}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-8 rounded-2xl border bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔎 Search product..."
          className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-500"
        />
      </div>

      {/* Products */}
      <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-sm">Product</th>
                <th className="px-5 py-4 text-sm">Unit</th>
                <th className="px-5 py-4 text-sm">Stock</th>
                <th className="px-5 py-4 text-sm">Purchase Rate</th>
                <th className="px-5 py-4 text-sm">Status</th>
                <th className="px-5 py-4 text-sm">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >
                    <div className="text-4xl">📦</div>
                    <p className="mt-3 font-semibold">
                      No products found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first product to start inventory management.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow =
                    Number(product.current_stock) <=
                    Number(product.min_stock);

                  return (
                    <tr
                      key={product.id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {product.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.unit}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {Number(product.current_stock).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        ₹{Number(product.purchase_rate).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        {isLow ? (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Add Product</h2>
                <p className="text-sm text-slate-500">
                  Enter product and stock details
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={addProduct} className="mt-6 space-y-4">

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Product Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Example: Bhusa"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Unit
                </label>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="KG">KG</option>
                  <option value="Quintal">Quintal</option>
                  <option value="Bag">Bag</option>
                  <option value="Ton">Ton</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.opening_stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        opening_stock: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        min_stock: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Purchase Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_rate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        purchase_rate: e.target.value,
                      })
                    }
                    placeholder="₹0"
                    className="w-full rounded-xl border px-4 py-3"
                  />
                </div>

                <div>
                </div>

              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Save Product
              </button>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}
