"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer_name: string | null;
  total_amount: number;
  profit: number;
  payment_status: string;
};

type Product = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
};

type Purchase = {
  id: string;
  total_amount: number;
  purchase_date: string;
};

type Expense = {
  id: string;
  amount: number;
  expense_date: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function Dashboard() {
  const supabase = createClient();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    const today = todayString();

    const [salesResult, productsResult, purchasesResult, expensesResult] =
      await Promise.all([
        supabase
          .from("sales")
          .select(
            "id, invoice_number, sale_date, customer_name, total_amount, profit, payment_status"
          )
          .order("sale_date", { ascending: false }),

        supabase
          .from("products")
          .select("id, name, unit, current_stock, min_stock")
          .order("name", { ascending: true }),

        supabase
          .from("purchases")
          .select("id, total_amount, purchase_date")
          .order("purchase_date", { ascending: false }),

        supabase
          .from("expenses")
          .select("id, amount, expense_date")
          .order("expense_date", { ascending: false }),
      ]);

    if (salesResult.error) console.error(salesResult.error);
    if (productsResult.error) console.error(productsResult.error);
    if (purchasesResult.error) console.error(purchasesResult.error);
    if (expensesResult.error) console.error(expensesResult.error);

    setSales(salesResult.data || []);
    setProducts(productsResult.data || []);
    setPurchases(purchasesResult.data || []);
    setExpenses(expensesResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const today = todayString();

  const todaySales = useMemo(
    () =>
      sales
        .filter((sale) => sale.sale_date === today)
        .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
    [sales, today]
  );

  const todayProfit = useMemo(
    () =>
      sales
        .filter((sale) => sale.sale_date === today)
        .reduce((sum, sale) => sum + Number(sale.profit || 0), 0),
    [sales, today]
  );

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.current_stock || 0),
    0
  );

  const pendingPayments = sales
    .filter((sale) => sale.payment_status !== "Paid")
    .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount || 0),
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.current_stock || 0) <= Number(product.min_stock || 0)
  );

  const recentSales = sales.slice(0, 6);

  const monthSales = sales
    .filter((sale) => sale.sale_date?.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white lg:block">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold">KisanFeed</h1>
          <p className="text-xs text-slate-500">Business Management</p>
        </div>

        <nav className="space-y-1 p-4">
          {[
            ["Dashboard", "/"],
            ["Products & Stock", "/products"],
            ["Sales", "/sales"],
            ["Purchase", "/purchases"],
            ["Customers", "/customers"],
            ["Suppliers", "/suppliers"],
            ["Expenses", "/expenses"],
            ["Reports", "/reports"],
          ].map(([name, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                href === "/"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {name}
            </a>
          ))}
        </nav>
      </aside>

      <main className="lg:ml-64">
        <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <p className="text-sm text-slate-500">
                Welcome back — here's your business overview.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadDashboard}
                className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                ↻ Refresh
              </button>

              <a
                href="/sales"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + New Sale
              </a>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Today's Sales</p>
              <p className="mt-2 text-2xl font-bold">
                {money(todaySales)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Month: {money(monthSales)}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Today's Profit</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {money(todayProfit)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                From today's sales
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Total Stock</p>
              <p className="mt-2 text-2xl font-bold">{totalStock}</p>
              <p className="mt-1 text-xs text-slate-400">
                {products.length} products
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Pending Payments</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {money(pendingPayments)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Unpaid / partial sales
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Business Summary</h3>
                  <p className="text-sm text-slate-500">
                    Overall financial snapshot
                  </p>
                </div>

                <a
                  href="/reports"
                  className="text-sm font-semibold text-slate-700 hover:underline"
                >
                  View Reports →
                </a>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Purchases</p>
                  <p className="mt-2 text-xl font-bold">
                    {money(totalPurchases)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Expenses</p>
                  <p className="mt-2 text-xl font-bold">
                    {money(totalExpenses)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Sales</p>
                  <p className="mt-2 text-xl font-bold">
                    {money(
                      sales.reduce(
                        (sum, sale) =>
                          sum + Number(sale.total_amount || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Sales activity</span>
                  <span className="font-medium">
                    {sales.length} transactions
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{
                      width: `${Math.min(
                        Math.max(sales.length * 10, 4),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-bold">Quick Actions</h3>
              <p className="text-sm text-slate-500">
                Manage your business quickly
              </p>

              <div className="mt-5 space-y-3">
                {[
                  ["+ New Sale", "/sales"],
                  ["+ Add Purchase", "/purchases"],
                  ["+ Add Product", "/products"],
                  ["+ Add Expense", "/expenses"],
                ].map(([name, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="block rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h3 className="font-bold">Recent Sales</h3>
                  <p className="text-sm text-slate-500">
                    Latest transactions
                  </p>
                </div>

                <a
                  href="/sales"
                  className="text-sm font-semibold hover:underline"
                >
                  View All →
                </a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Invoice</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : recentSales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No sales yet.
                        </td>
                      </tr>
                    ) : (
                      recentSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium">
                            {sale.invoice_number}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {sale.customer_name || "Walk-in"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {money(Number(sale.total_amount))}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                sale.payment_status === "Paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {sale.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h3 className="font-bold">Stock Status</h3>
                  <p className="text-sm text-slate-500">
                    Products needing attention
                  </p>
                </div>

                <a
                  href="/products"
                  className="text-sm font-semibold hover:underline"
                >
                  Manage Stock →
                </a>
              </div>

              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">
                    Loading...
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="p-8 text-center text-emerald-600">
                    ✓ All products have sufficient stock.
                  </div>
                ) : (
                  lowStockProducts.slice(0, 6).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between px-5 py-4"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          Minimum: {product.min_stock} {product.unit}
                        </p>
                      </div>

                      <span className="font-semibold text-amber-600">
                        {product.current_stock} {product.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
