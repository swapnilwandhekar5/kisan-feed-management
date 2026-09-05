"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  payment_mode: string;
  description: string | null;
};

const categories = [
  "Transport",
  "Salary",
  "Electricity",
  "Rent",
  "Food",
  "Office",
  "Maintenance",
  "Other",
];

const paymentModes = ["Cash", "UPI", "Bank Transfer", "Cheque"];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function ExpensesPage() {
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    expense_date: today,
    category: "Transport",
    amount: "",
    payment_mode: "Cash",
    description: "",
  });

  async function loadExpenses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) {
      setExpenses(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();

    const amount = Number(form.amount);

    if (!form.expense_date || !form.category || amount <= 0) {
      alert("Please enter valid expense details.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("expenses").insert({
      expense_date: form.expense_date,
      category: form.category,
      amount,
      payment_mode: form.payment_mode,
      description: form.description.trim() || null,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      expense_date: today,
      category: "Transport",
      amount: "",
      payment_mode: "Cash",
      description: "",
    });

    setShowForm(false);
    loadExpenses();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setExpenses((prev) => prev.filter((item) => item.id !== id));
  }

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return expenses;

    return expenses.filter(
      (item) =>
        item.category.toLowerCase().includes(q) ||
        item.payment_mode.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const monthExpenses = expenses
    .filter((item) => item.expense_date?.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-white lg:block">
        <div className="border-b px-6 py-5">
          <h1 className="text-xl font-bold">KisanFeed</h1>
          <p className="text-xs text-slate-500">Business Management</p>
        </div>

        <nav className="p-4 space-y-1">
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
                href === "/expenses"
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
              <h2 className="text-2xl font-bold">Expenses</h2>
              <p className="text-sm text-slate-500">
                Manage business expenses
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Add Expense
            </button>
          </div>
        </header>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Total Expenses</p>
              <p className="mt-2 text-2xl font-bold">{money(totalExpenses)}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">This Month</p>
              <p className="mt-2 text-2xl font-bold">
                {money(monthExpenses)}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">Expense Entries</p>
              <p className="mt-2 text-2xl font-bold">{expenses.length}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white">
            <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold">Expense History</h3>
                <p className="text-sm text-slate-500">
                  Track all business expenses
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expenses..."
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-slate-500 md:w-72"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No expenses found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          {new Date(expense.expense_date).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {expense.category}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {expense.description || "—"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {money(Number(expense.amount))}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                            {expense.payment_mode}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h3 className="text-lg font-bold">Add Expense</h3>
                <p className="text-sm text-slate-500">
                  Enter your business expense
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={addExpense} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) =>
                    setForm({ ...form, expense_date: e.target.value })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Mode
                </label>
                <select
                  value={form.payment_mode}
                  onChange={(e) =>
                    setForm({ ...form, payment_mode: e.target.value })
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  {paymentModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border px-4 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
