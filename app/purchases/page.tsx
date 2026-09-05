"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  purchase_rate: number;
};

type Purchase = {
  id: string;
  invoice_number: string;
  purchase_date: string;
  supplier_name: string | null;
  product_id: string;
  quantity: number;
  unit: string;
  purchase_rate: number;
  total_amount: number;
  payment_status: string;
  payment_mode: string;
  notes: string | null;
  products?: { name: string } | null;
};

const supabase = createClient();

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplier_name: "",
    product_id: "",
    quantity: "",
    purchase_rate: "",
    payment_status: "Paid",
    payment_mode: "Cash",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [productsResult, purchasesResult] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,unit,current_stock,purchase_rate")
        .order("name"),

      supabase
        .from("purchases")
        .select("*,products(name)")
        .order("purchase_date", { ascending: false }),
    ]);

    if (productsResult.data) setProducts(productsResult.data);
    if (purchasesResult.data) setPurchases(purchasesResult.data);

    setLoading(false);
  }

  function openNewPurchase() {
    setForm({
      supplier_name: "",
      product_id: products[0]?.id || "",
      quantity: "",
      purchase_rate: "",
      payment_status: "Paid",
      payment_mode: "Cash",
      notes: "",
    });

    setShowModal(true);
  }

  async function addPurchase(e: React.FormEvent) {
    e.preventDefault();

    const product = products.find((p) => p.id === form.product_id);
    const quantity = Number(form.quantity);
    const purchaseRate = Number(form.purchase_rate);

    if (!product) {
      alert("Please select a product.");
      return;
    }

    if (!quantity || quantity <= 0) {
      alert("Please enter valid quantity.");
      return;
    }

    if (!purchaseRate || purchaseRate <= 0) {
      alert("Please enter purchase rate.");
      return;
    }

    const totalAmount = quantity * purchaseRate;

    setSaving(true);

    const nextInvoice =
      "PUR-" +
      String(
        purchases.reduce((max, purchase) => {
          const n = Number(
            purchase.invoice_number.replace("PUR-", "")
          );

          return Math.max(max, isNaN(n) ? 0 : n);
        }, 0) + 1
      ).padStart(3, "0");

    const { error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        invoice_number: nextInvoice,
        purchase_date: new Date().toISOString().split("T")[0],
        supplier_name: form.supplier_name || null,
        product_id: product.id,
        quantity,
        unit: product.unit,
        purchase_rate: purchaseRate,
        total_amount: totalAmount,
        payment_status: form.payment_status,
        payment_mode: form.payment_mode,
        notes: form.notes || null,
      });

    if (purchaseError) {
      alert("Purchase save failed: " + purchaseError.message);
      setSaving(false);
      return;
    }

    const newStock = Number(product.current_stock) + quantity;

    const { error: stockError } = await supabase
      .from("products")
      .update({
        current_stock: newStock,
        purchase_rate: purchaseRate,
      })
      .eq("id", product.id);

    if (stockError) {
      alert(
        "Purchase saved, but stock update failed: " +
          stockError.message
      );
    }

    setShowModal(false);
    setSaving(false);

    await loadData();
  }

  async function deletePurchase(purchase: Purchase) {
    const ok = confirm(
      `Delete ${purchase.invoice_number}? Purchased stock will be removed.`
    );

    if (!ok) return;

    const product = products.find(
      (p) => p.id === purchase.product_id
    );

    if (product) {
      if (
        Number(product.current_stock) <
        Number(purchase.quantity)
      ) {
        alert(
          "Cannot delete this purchase because current stock is already lower than the purchased quantity."
        );
        return;
      }
    }

    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchase.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    if (product) {
      await supabase
        .from("products")
        .update({
          current_stock:
            Number(product.current_stock) -
            Number(purchase.quantity),
        })
        .eq("id", product.id);
    }

    await loadData();
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const text = `${purchase.invoice_number} ${
      purchase.supplier_name || ""
    } ${purchase.products?.name || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const totalPurchases = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.total_amount || 0),
    0
  );

  const totalQuantity = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.quantity || 0),
    0
  );

  const pendingAmount = purchases
    .filter((purchase) => purchase.payment_status !== "Paid")
    .reduce(
      (sum, purchase) =>
        sum + Number(purchase.total_amount || 0),
      0
    );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">

        <aside className="hidden w-64 border-r bg-white p-5 lg:block">
          <div className="mb-8">
            <h1 className="text-xl font-bold">
              KisanFeed
            </h1>

            <p className="text-sm text-slate-500">
              Business Management
            </p>
          </div>

          <nav className="space-y-1">
            {[
              ["Dashboard", "/"],
              ["Products & Stock", "/products"],
              ["Sales", "/sales"],
              ["Purchase", "/purchases"],
              ["Customers", "/customers"],
              ["Suppliers", "/suppliers"],
              ["Expenses", "/expenses"],
              ["Reports", "/reports"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                  href === "/purchases"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex-1">

          <header className="border-b bg-white px-6 py-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

              <div>
                <h2 className="text-2xl font-bold">
                  Purchase Management
                </h2>

                <p className="text-sm text-slate-500">
                  Record purchases and increase stock
                </p>
              </div>

              <button
                onClick={openNewPurchase}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Add Purchase
              </button>

            </div>
          </header>

          <div className="space-y-6 p-6">

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Purchases
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {money(totalPurchases)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Quantity
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {totalQuantity}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Pending / Partial
                </p>

                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {money(pendingAmount)}
                </p>
              </div>

            </div>

            <div className="rounded-2xl border bg-white">

              <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">

                <div>
                  <h3 className="font-bold">
                    Purchase History
                  </h3>

                  <p className="text-sm text-slate-500">
                    {purchases.length} total purchases
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search invoice, supplier, product..."
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:w-80"
                />

              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading purchases...
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="p-10 text-center">

                  <p className="font-semibold">
                    No purchases found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Click “Add Purchase” to record your first purchase.
                  </p>

                </div>
              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>
                        <th className="px-5 py-4">
                          Invoice
                        </th>

                        <th className="px-5 py-4">
                          Supplier
                        </th>

                        <th className="px-5 py-4">
                          Product
                        </th>

                        <th className="px-5 py-4">
                          Qty
                        </th>

                        <th className="px-5 py-4">
                          Rate
                        </th>

                        <th className="px-5 py-4">
                          Amount
                        </th>

                        <th className="px-5 py-4">
                          Payment
                        </th>

                        <th className="px-5 py-4">
                          Action
                        </th>
                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredPurchases.map((purchase) => (

                        <tr
                          key={purchase.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 font-semibold">
                            {purchase.invoice_number}

                            <div className="text-xs font-normal text-slate-400">
                              {purchase.purchase_date}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {purchase.supplier_name ||
                              "Unknown Supplier"}
                          </td>

                          <td className="px-5 py-4">
                            {purchase.products?.name ||
                              "Product"}
                          </td>

                          <td className="px-5 py-4">
                            {purchase.quantity}{" "}
                            {purchase.unit}
                          </td>

                          <td className="px-5 py-4">
                            {money(
                              Number(
                                purchase.purchase_rate
                              )
                            )}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {money(
                              Number(
                                purchase.total_amount
                              )
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                purchase.payment_status ===
                                "Paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {purchase.payment_status}
                            </span>

                          </td>

                          <td className="px-5 py-4">

                            <button
                              onClick={() =>
                                deletePurchase(purchase)
                              }
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </div>

        </section>
      </div>

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-6">

              <div>
                <h3 className="text-xl font-bold">
                  Add Purchase
                </h3>

                <p className="text-sm text-slate-500">
                  Stock will automatically increase after saving.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={addPurchase}
              className="space-y-5 p-6"
            >

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Supplier Name
                </label>

                <input
                  value={form.supplier_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supplier_name: e.target.value,
                    })
                  }
                  placeholder="Supplier name"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Product
                </label>

                <select
                  value={form.product_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product_id: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                  required
                >

                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (

                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} — Current Stock:{" "}
                      {product.current_stock}{" "}
                      {product.unit}
                    </option>

                  ))}

                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
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
                    placeholder="₹ per unit"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </div>

              </div>

              {form.quantity &&
                form.purchase_rate && (

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs text-slate-500">
                      Total Purchase Amount
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {money(
                        Number(form.quantity) *
                          Number(form.purchase_rate)
                      )}
                    </p>

                  </div>
                )}

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Payment Status
                  </label>

                  <select
                    value={form.payment_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        payment_status: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Partial</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Payment Mode
                  </label>

                  <select
                    value={form.payment_mode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        payment_mode: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>Credit</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="flex gap-3 border-t pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="flex-1 rounded-xl border px-5 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Purchase"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}
    </main>
  );
}
