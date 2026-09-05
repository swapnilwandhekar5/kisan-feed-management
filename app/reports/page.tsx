"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sale = {
  id: string;
  invoice_number: string;
  sale_date: string;
  customer_name: string | null;
  total_amount: number;
  total_cost: number;
  profit: number;
  paid_amount: number;
  payment_status: string;
};

type Purchase = {
  id: string;
  invoice_number: string;
  purchase_date: string;
  supplier_name: string | null;
  total_amount: number;
};

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
};

type Product = {
  id: string;
  name: string;
  unit: string;
  opening_stock: number;
  purchase_rate: number;
  min_stock: number;
};

type Payment = {
  id: string;
  payment_date: string;
  customer_name: string | null;
  amount: number;
  payment_mode: string;
  sale_id: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayString() {
  return dateString(new Date());
}

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return dateString(d);
}

function inDateRange(
  value: string,
  fromDate: string,
  toDate: string
) {
  return value >= fromDate && value <= toDate;
}

export default function ReportsPage() {
  const supabase = createClient();

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(todayString());

  async function loadReports() {
    setLoading(true);

    const [
      salesResult,
      purchasesResult,
      expensesResult,
      productsResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from("sales")
        .select(
          "id,invoice_number,sale_date,customer_name,total_amount,total_cost,profit,paid_amount,payment_status"
        )
        .order("sale_date", { ascending: false }),

      supabase
        .from("purchases")
        .select(
          "id,invoice_number,purchase_date,supplier_name,total_amount"
        )
        .order("purchase_date", { ascending: false }),

      supabase
        .from("expenses")
        .select("id,expense_date,category,amount")
        .order("expense_date", { ascending: false }),

      supabase
        .from("products")
        .select(
          "id,name,unit,opening_stock,purchase_rate,min_stock"
        )
        .order("name", { ascending: true }),

      supabase
        .from("payments")
        .select(
          "id,payment_date,customer_name,amount,payment_mode,sale_id"
        )
        .order("payment_date", { ascending: false }),
    ]);

    if (salesResult.error) alert(salesResult.error.message);
    if (purchasesResult.error) alert(purchasesResult.error.message);
    if (expensesResult.error) alert(expensesResult.error.message);
    if (productsResult.error) alert(productsResult.error.message);
    if (paymentsResult.error) alert(paymentsResult.error.message);

    setSales(salesResult.data || []);
    setPurchases(purchasesResult.data || []);
    setExpenses(expensesResult.data || []);
    setProducts(productsResult.data || []);
    setPayments(paymentsResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const filteredSales = useMemo(
    () =>
      sales.filter((item) =>
        inDateRange(item.sale_date, fromDate, toDate)
      ),
    [sales, fromDate, toDate]
  );

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((item) =>
        inDateRange(item.purchase_date, fromDate, toDate)
      ),
    [purchases, fromDate, toDate]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((item) =>
        inDateRange(item.expense_date, fromDate, toDate)
      ),
    [expenses, fromDate, toDate]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((item) =>
        inDateRange(item.payment_date, fromDate, toDate)
      ),
    [payments, fromDate, toDate]
  );

  const totalSales = filteredSales.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const totalCost = filteredSales.reduce(
    (sum, item) => sum + Number(item.total_cost || 0),
    0
  );

  const grossProfit = filteredSales.reduce(
    (sum, item) => sum + Number(item.profit || 0),
    0
  );

  const totalPurchases = filteredPurchases.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const totalExpenses = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalReceived = filteredPayments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const netProfit = grossProfit - totalExpenses;

  const totalStockValue = products.reduce(
    (sum, item) =>
      sum +
      Number(item.opening_stock || 0) *
        Number(item.purchase_rate || 0),
    0
  );

  const totalStockQuantity = products.reduce(
    (sum, item) => sum + Number(item.opening_stock || 0),
    0
  );

  const lowStockProducts = products.filter(
    (item) =>
      Number(item.opening_stock || 0) <=
      Number(item.min_stock || 0)
  );

  const pendingAmount = filteredSales.reduce(
    (sum, item) =>
      sum +
      Math.max(
        Number(item.total_amount || 0) -
          Number(item.paid_amount || 0),
        0
      ),
    0
  );

  const categoryTotals = filteredExpenses.reduce<
    Record<string, number>
  >((acc, item) => {
    acc[item.category] =
      (acc[item.category] || 0) + Number(item.amount || 0);

    return acc;
  }, {});

  const paymentModeTotals = filteredPayments.reduce<
    Record<string, number>
  >((acc, item) => {
    acc[item.payment_mode] =
      (acc[item.payment_mode] || 0) +
      Number(item.amount || 0);

    return acc;
  }, {});

  const salesByDate = filteredSales.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.sale_date] =
        (acc[item.sale_date] || 0) +
        Number(item.total_amount || 0);

      return acc;
    },
    {}
  );

  const resetDates = () => {
    setFromDate(firstDayOfMonth());
    setToDate(todayString());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white lg:block">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold">KisanFeed</h1>
          <p className="text-xs text-slate-500">
            Business Management
          </p>
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
            ["Payments", "/payments"],
            ["Reports", "/reports"],
          ].map(([name, href]) => (
            <a
              key={href}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                href === "/reports"
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
          <div className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Reports</h2>
              <p className="text-sm text-slate-500">
                Business performance and financial reports
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <button
                onClick={resetDates}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                This Month
              </button>

              <button
                onClick={loadReports}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              Report Period
            </p>
            <p className="mt-1 font-semibold">
              {fromDate} → {toDate}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">
                Sales Revenue
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(totalSales)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {filteredSales.length} sales
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">
                Purchases
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(totalPurchases)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {filteredPurchases.length} purchases
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">
                Expenses
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(totalExpenses)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {filteredExpenses.length} entries
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">
                Net Profit
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  netProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {money(netProfit)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Gross profit − expenses
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-bold">Profit Summary</h3>

              <div className="mt-5 space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Sales Revenue
                  </span>
                  <span className="font-semibold">
                    {money(totalSales)}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Product Cost
                  </span>
                  <span className="font-semibold text-red-600">
                    - {money(totalCost)}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Gross Profit
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {money(grossProfit)}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Other Expenses
                  </span>
                  <span className="font-semibold text-red-600">
                    - {money(totalExpenses)}
                  </span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="font-bold">Net Profit</span>
                  <span
                    className={`font-bold ${
                      netProfit >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {money(netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6">
              <h3 className="font-bold">Payment Summary</h3>

              <div className="mt-5 space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Received in Period
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {money(totalReceived)}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Sales Outstanding
                  </span>
                  <span className="font-semibold text-red-600">
                    {money(pendingAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-slate-500">
                    Payment Entries
                  </span>
                  <span className="font-semibold">
                    {filteredPayments.length}
                  </span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="font-bold">
                    Collection %
                  </span>
                  <span className="font-bold">
                    {totalSales > 0
                      ? `${Math.round(
                          (totalReceived / totalSales) * 100
                        )}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white">
              <div className="border-b p-5">
                <h3 className="font-bold">
                  Expense Breakdown
                </h3>
                <p className="text-sm text-slate-500">
                  Category-wise expenses for selected period
                </p>
              </div>

              <div className="divide-y">
                {Object.keys(categoryTotals).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No expenses recorded for this period.
                  </div>
                ) : (
                  Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <span className="font-medium">
                          {category}
                        </span>

                        <span className="font-semibold">
                          {money(amount)}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white">
              <div className="border-b p-5">
                <h3 className="font-bold">
                  Payment Mode Breakdown
                </h3>
                <p className="text-sm text-slate-500">
                  Collection by payment method
                </p>
              </div>

              <div className="divide-y">
                {Object.keys(paymentModeTotals).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No payments recorded for this period.
                  </div>
                ) : (
                  Object.entries(paymentModeTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([mode, amount]) => (
                      <div
                        key={mode}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <span className="font-medium">
                          {mode}
                        </span>

                        <span className="font-semibold text-emerald-600">
                          {money(amount)}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h3 className="font-bold">Stock Summary</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Total Products
                </p>
                <p className="mt-1 text-xl font-bold">
                  {products.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Total Stock
                </p>
                <p className="mt-1 text-xl font-bold">
                  {totalStockQuantity.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Stock Value
                </p>
                <p className="mt-1 text-xl font-bold">
                  {money(totalStockValue)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Low Stock Items
                </p>
                <p className="mt-1 text-xl font-bold text-amber-600">
                  {lowStockProducts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-bold">Sales by Date</h3>
              <p className="text-sm text-slate-500">
                Daily sales revenue for selected period
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Sales</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {Object.keys(salesByDate).length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No sales for this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(salesByDate)
                      .sort((a, b) =>
                        b[0].localeCompare(a[0])
                      )
                      .map(([date, amount]) => (
                        <tr key={date}>
                          <td className="px-5 py-4 font-medium">
                            {new Date(
                              `${date}T00:00:00`
                            ).toLocaleDateString("en-IN")}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {money(amount)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-bold">Low Stock Products</h3>
              <p className="text-sm text-slate-500">
                Products requiring attention
              </p>
            </div>

            <div className="divide-y">
              {lowStockProducts.length === 0 ? (
                <div className="p-8 text-center text-sm text-emerald-600">
                  All products have sufficient stock.
                </div>
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div>
                      <p className="font-medium">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        Minimum: {product.min_stock}{" "}
                        {product.unit}
                      </p>
                    </div>

                    <span className="font-semibold text-amber-600">
                      {product.opening_stock} {product.unit}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-bold">Recent Sales</h3>
              <p className="text-sm text-slate-500">
                Sales within selected period
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Sales</th>
                    <th className="px-5 py-4">Received</th>
                    <th className="px-5 py-4">Due</th>
                    <th className="px-5 py-4">Profit</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        Loading reports...
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No sales available for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredSales
                      .slice(0, 20)
                      .map((sale) => {
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
                            <td className="px-5 py-4 font-medium">
                              {sale.invoice_number}
                            </td>

                            <td className="px-5 py-4">
                              {new Date(
                                `${sale.sale_date}T00:00:00`
                              ).toLocaleDateString("en-IN")}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {sale.customer_name ||
                                "Walk-in Customer"}
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

                            <td className="px-5 py-4 text-red-600">
                              {money(due)}
                            </td>

                            <td className="px-5 py-4 font-semibold text-emerald-600">
                              {money(Number(sale.profit))}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  sale.payment_status ===
                                  "Paid"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : sale.payment_status ===
                                      "Partial"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {sale.payment_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-bold">Purchase Report</h3>
              <p className="text-sm text-slate-500">
                Purchases within selected period
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No purchases available for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases
                      .slice(0, 20)
                      .map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 font-medium">
                            {purchase.invoice_number}
                          </td>

                          <td className="px-5 py-4">
                            {new Date(
                              `${purchase.purchase_date}T00:00:00`
                            ).toLocaleDateString("en-IN")}
                          </td>

                          <td className="px-5 py-4">
                            {purchase.supplier_name ||
                              "No Supplier"}
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {money(
                              Number(purchase.total_amount)
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
