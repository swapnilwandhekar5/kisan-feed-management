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

type Customer = {
  id: string;
  name: string;
  mobile: string | null;
};

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer_id: string | null;
  customer_name: string | null;
  product_id: string;
  quantity: number;
  unit: string;
  purchase_rate: number;
  selling_rate: number;
  total_amount: number;
  total_cost: number;
  profit: number;
  paid_amount: number;
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

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    product_id: "",
    quantity: "",
    selling_rate: "",
    paid_amount: "",
    payment_mode: "Cash",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [productsResult, customersResult, salesResult] =
      await Promise.all([
        supabase
          .from("products")
          .select("id,name,unit,current_stock,purchase_rate")
          .order("name"),

        supabase
          .from("customers")
          .select("id,name,mobile")
          .order("name"),

        supabase
          .from("sales")
          .select("*,products(name)")
          .order("sale_date", { ascending: false }),
      ]);

    if (productsResult.data) setProducts(productsResult.data);
    if (customersResult.data) setCustomers(customersResult.data);
    if (salesResult.data) setSales(salesResult.data);

    if (productsResult.error) {
      console.error(productsResult.error);
    }

    if (customersResult.error) {
      console.error(customersResult.error);
    }

    if (salesResult.error) {
      console.error(salesResult.error);
    }

    setLoading(false);
  }

  function openNewSale() {
    setForm({
      customer_id: "",
      customer_name: "",
      product_id: products[0]?.id || "",
      quantity: "",
      selling_rate: "",
      paid_amount: "",
      payment_mode: "Cash",
      notes: "",
    });

    setShowModal(true);
  }

  function getPaymentStatus(totalAmount: number, paidAmount: number) {
    if (paidAmount <= 0) return "Pending";
    if (paidAmount >= totalAmount) return "Paid";
    return "Partial";
  }

  async function addSale(e: React.FormEvent) {
    e.preventDefault();

    const product = products.find((p) => p.id === form.product_id);
    const quantity = Number(form.quantity);
    const sellingRate = Number(form.selling_rate);
    const paidAmount = Number(form.paid_amount || 0);

    if (!product) {
      alert("Please select a product.");
      return;
    }

    if (!quantity || quantity <= 0) {
      alert("Please enter valid quantity.");
      return;
    }

    if (!sellingRate || sellingRate <= 0) {
      alert("Please enter selling rate.");
      return;
    }

    if (quantity > Number(product.current_stock)) {
      alert(`Only ${product.current_stock} ${product.unit} stock available.`);
      return;
    }

    const purchaseRate = Number(product.purchase_rate || 0);
    const totalAmount = quantity * sellingRate;
    const totalCost = quantity * purchaseRate;
    const profit = totalAmount - totalCost;

    if (paidAmount < 0) {
      alert("Paid amount cannot be negative.");
      return;
    }

    if (paidAmount > totalAmount) {
      alert(
        `Paid amount cannot be greater than total amount ${money(
          totalAmount
        )}.`
      );
      return;
    }

    const paymentStatus = getPaymentStatus(totalAmount, paidAmount);

    setSaving(true);

    const nextInvoice =
      "INV-" +
      String(
        sales.reduce((max, sale) => {
          const n = Number(sale.invoice_number.replace("INV-", ""));
          return Math.max(max, isNaN(n) ? 0 : n);
        }, 0) + 1
      ).padStart(3, "0");

    const saleDate = new Date().toISOString().split("T")[0];

    const selectedCustomer = customers.find(
      (customer) => customer.id === form.customer_id
    );

    const customerName =
      selectedCustomer?.name || form.customer_name.trim() || null;

    const { data: insertedSale, error: saleError } = await supabase
      .from("sales")
      .insert({
        invoice_number: nextInvoice,
        sale_date: saleDate,
        customer_id: selectedCustomer?.id || null,
        customer_name: customerName,
        product_id: product.id,
        quantity,
        unit: product.unit,
        purchase_rate: purchaseRate,
        selling_rate: sellingRate,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit,
        paid_amount: paidAmount,
        payment_status: paymentStatus,
        payment_mode: form.payment_mode,
        notes: form.notes || null,
      })
      .select("id")
      .single();

    if (saleError || !insertedSale) {
      alert("Sale save failed: " + (saleError?.message || "Unknown error"));
      setSaving(false);
      return;
    }

    const newStock = Number(product.current_stock) - quantity;

    const { error: stockError } = await supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", product.id);

    if (stockError) {
      alert("Sale saved, but stock update failed: " + stockError.message);
      setSaving(false);
      return;
    }

    if (paidAmount > 0 && selectedCustomer?.id) {
      const paymentNumber =
        "PAY-" +
        String(
          Date.now()
        ).slice(-6);

      const { error: paymentError } = await supabase.from("payments").insert({
        payment_number: paymentNumber,
        payment_date: saleDate,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        sale_id: insertedSale.id,
        amount: paidAmount,
        payment_mode: form.payment_mode,
        reference_number: nextInvoice,
        notes: `Initial payment for ${nextInvoice}`,
      });

      if (paymentError) {
        alert(
          "Sale saved successfully, but payment entry failed: " +
            paymentError.message
        );
      }
    }

    setShowModal(false);
    setSaving(false);
    await loadData();
  }

  async function deleteSale(sale: Sale) {
    const ok = confirm(
      `Delete ${sale.invoice_number}? Stock will be restored and linked payment will be deleted.`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", sale.id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    const product = products.find((p) => p.id === sale.product_id);

    if (product) {
      await supabase
        .from("products")
        .update({
          current_stock:
            Number(product.current_stock) + Number(sale.quantity),
        })
        .eq("id", product.id);
    }

    await loadData();
  }

  const filteredSales = sales.filter((sale) => {
    const text = `${sale.invoice_number} ${
      sale.customer_name || ""
    } ${sale.products?.name || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalProfit = sales.reduce(
    (sum, sale) => sum + Number(sale.profit || 0),
    0
  );

  const totalReceived = sales.reduce(
    (sum, sale) => sum + Number(sale.paid_amount || 0),
    0
  );

  const pendingAmount = Math.max(totalSales - totalReceived, 0);

  const previewProduct = products.find(
    (p) => p.id === form.product_id
  );

  const previewQuantity = Number(form.quantity || 0);
  const previewRate = Number(form.selling_rate || 0);
  const previewTotal = previewQuantity * previewRate;
  const previewPaid = Number(form.paid_amount || 0);
  const previewOutstanding = Math.max(
    previewTotal - previewPaid,
    0
  );
  const previewStatus = getPaymentStatus(
    previewTotal,
    previewPaid
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-white p-5 lg:block">
          <div className="mb-8">
            <h1 className="text-xl font-bold">KisanFeed</h1>
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
              ["Payments", "/payments"],
              ["Reports", "/reports"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                  href === "/sales"
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
                  Sales & Billing
                </h2>
                <p className="text-sm text-slate-500">
                  Create invoices and manage sales
                </p>
              </div>

              <button
                onClick={openNewSale}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + New Sale
              </button>
            </div>
          </header>

          <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Sales
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {money(totalSales)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Received
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {money(totalReceived)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Outstanding
                </p>
                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {money(pendingAmount)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <p className="text-sm text-slate-500">
                  Total Profit
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {money(totalProfit)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border bg-white">
              <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold">Sales History</h3>
                  <p className="text-sm text-slate-500">
                    {sales.length} total invoices
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice, customer, product..."
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 md:w-80"
                />
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading sales...
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-semibold">
                    No sales found
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Click “New Sale” to create your first invoice.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Invoice</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Product</th>
                        <th className="px-5 py-4">Qty</th>
                        <th className="px-5 py-4">Amount</th>
                        <th className="px-5 py-4">Received</th>
                        <th className="px-5 py-4">Due</th>
                        <th className="px-5 py-4">Profit</th>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {filteredSales.map((sale) => {
                        const due = Math.max(
                          Number(sale.total_amount || 0) -
                            Number(sale.paid_amount || 0),
                          0
                        );

                        return (
                          <tr
                            key={sale.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-semibold">
                              {sale.invoice_number}
                              <div className="text-xs font-normal text-slate-400">
                                {sale.sale_date}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {sale.customer_name ||
                                "Walk-in Customer"}
                            </td>

                            <td className="px-5 py-4">
                              {sale.products?.name ||
                                "Product"}
                            </td>

                            <td className="px-5 py-4">
                              {sale.quantity} {sale.unit}
                            </td>

                            <td className="px-5 py-4 font-semibold">
                              {money(
                                Number(sale.total_amount)
                              )}
                            </td>

                            <td className="px-5 py-4 text-emerald-600">
                              {money(
                                Number(sale.paid_amount || 0)
                              )}
                            </td>

                            <td className="px-5 py-4 text-orange-600">
                              {money(due)}
                            </td>

                            <td className="px-5 py-4 font-semibold text-emerald-600">
                              {money(Number(sale.profit))}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  sale.payment_status ===
                                  "Paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : sale.payment_status ===
                                      "Partial"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {sale.payment_status}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  deleteSale(sale)
                                }
                                className="text-sm font-medium text-red-600 hover:underline"
                              >
                                Delete
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
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h3 className="text-xl font-bold">
                  Create New Sale
                </h3>
                <p className="text-sm text-slate-500">
                  Selling rate is entered manually for every sale.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={addSale}
              className="space-y-5 p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Customer
                </label>

                <select
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_id: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">
                    Walk-in Customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                      {customer.mobile
                        ? ` — ${customer.mobile}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Customer Name (Optional for Walk-in)
                </label>

                <input
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_name: e.target.value,
                    })
                  }
                  placeholder="Enter walk-in customer name"
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
                      {product.name} — Stock:{" "}
                      {product.current_stock}{" "}
                      {product.unit} — Purchase:{" "}
                      {money(
                        Number(product.purchase_rate)
                      )}
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
                    Selling Rate
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_rate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        selling_rate: e.target.value,
                      })
                    }
                    placeholder="Enter today's selling rate"
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                    required
                  />
                </div>
              </div>

              {form.product_id &&
                form.quantity &&
                form.selling_rate && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Purchase Rate
                        </p>
                        <p className="font-bold">
                          {money(
                            Number(
                              previewProduct?.purchase_rate || 0
                            )
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Total Amount
                        </p>
                        <p className="font-bold">
                          {money(previewTotal)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Profit
                        </p>
                        <p className="font-bold text-emerald-600">
                          {money(
                            previewTotal -
                              previewQuantity *
                                Number(
                                  previewProduct?.purchase_rate ||
                                    0
                                )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Paid Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      paid_amount: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />

                {form.quantity && form.selling_rate && (
                  <div className="mt-3 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Total
                      </p>
                      <p className="font-bold">
                        {money(previewTotal)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Received
                      </p>
                      <p className="font-bold text-emerald-600">
                        {money(previewPaid)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Outstanding
                      </p>
                      <p className="font-bold text-orange-600">
                        {money(previewOutstanding)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {form.quantity && form.selling_rate && (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Payment Status
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        previewStatus === "Paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : previewStatus === "Partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {previewStatus}
                    </span>
                  </div>
                </div>
              )}

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
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border px-5 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
