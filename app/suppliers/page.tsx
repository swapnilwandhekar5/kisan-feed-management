"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Supplier = {
  id: string;
  name: string;
  mobile: string | null;
  address: string | null;
  opening_balance: number;
  created_at: string;
};

const supabase = createClient();

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
    opening_balance: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Suppliers load failed: " + error.message);
    } else {
      setSuppliers(data || []);
    }

    setLoading(false);
  }

  function openNewSupplier() {
    setForm({
      name: "",
      mobile: "",
      address: "",
      opening_balance: "",
    });

    setShowModal(true);
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter supplier name.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("suppliers").insert({
      name: form.name.trim(),
      mobile: form.mobile.trim() || null,
      address: form.address.trim() || null,
      opening_balance: Number(form.opening_balance || 0),
    });

    if (error) {
      alert("Supplier save failed: " + error.message);
      setSaving(false);
      return;
    }

    setShowModal(false);
    setSaving(false);

    await loadSuppliers();
  }

  async function deleteSupplier(supplier: Supplier) {
    const ok = confirm(
      `Delete supplier "${supplier.name}"?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplier.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    await loadSuppliers();
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const text = `${supplier.name} ${
      supplier.mobile || ""
    } ${supplier.address || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const totalOpeningBalance = suppliers.reduce(
    (sum, supplier) =>
      sum + Number(supplier.opening_balance || 0),
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
                  href === "/suppliers"
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
                  Suppliers
                </h2>

                <p className="text-sm text-slate-500">
                  Manage supplier details and balances
                </p>
              </div>

              <button
                onClick={openNewSupplier}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Add Supplier
              </button>

            </div>
          </header>

          <div className="space-y-6 p-6">

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Suppliers
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {suppliers.length}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Opening Balance
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {money(totalOpeningBalance)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Active Suppliers
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {suppliers.length}
                </p>
              </div>

            </div>

            <div className="rounded-2xl border bg-white">

              <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">

                <div>
                  <h3 className="font-bold">
                    Supplier List
                  </h3>

                  <p className="text-sm text-slate-500">
                    {suppliers.length} total suppliers
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search supplier or mobile..."
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:w-80"
                />

              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading suppliers...
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-10 text-center">

                  <p className="font-semibold">
                    No suppliers found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Click “Add Supplier” to create your first supplier.
                  </p>

                </div>
              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>
                        <th className="px-5 py-4">
                          Supplier
                        </th>

                        <th className="px-5 py-4">
                          Mobile
                        </th>

                        <th className="px-5 py-4">
                          Address
                        </th>

                        <th className="px-5 py-4">
                          Opening Balance
                        </th>

                        <th className="px-5 py-4">
                          Action
                        </th>
                      </tr>

                    </thead>

                    <tbody className="divide-y">

                      {filteredSuppliers.map((supplier) => (

                        <tr
                          key={supplier.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 font-semibold">
                            {supplier.name}
                          </td>

                          <td className="px-5 py-4">
                            {supplier.mobile || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {supplier.address || "—"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {money(
                              Number(
                                supplier.opening_balance
                              )
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <button
                              onClick={() =>
                                deleteSupplier(supplier)
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

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-6">

              <div>
                <h3 className="text-xl font-bold">
                  Add Supplier
                </h3>

                <p className="text-sm text-slate-500">
                  Enter supplier information
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
              onSubmit={addSupplier}
              className="space-y-5 p-6"
            >

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Supplier Name *
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter supplier name"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Mobile Number
                </label>

                <input
                  value={form.mobile}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      mobile: e.target.value,
                    })
                  }
                  placeholder="Enter mobile number"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Supplier address"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Opening Balance
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      opening_balance: e.target.value,
                    })
                  }
                  placeholder="₹ 0"
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
                    : "Save Supplier"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}
