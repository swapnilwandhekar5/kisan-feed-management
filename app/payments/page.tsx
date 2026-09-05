"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  mobile: string | null;
  opening_balance: number;
};

type Sale = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
};

type Payment = {
  id: string;
  payment_number: string;
  payment_date: string;
  customer_id: string | null;
  customer_name: string | null;
  sale_id: string | null;
  amount: number;
  payment_mode: string;
  reference_number: string | null;
  notes: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function todayString() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPaymentStatus(total: number, paid: number) {
  if (paid <= 0) return "Pending";
  if (paid >= total) return "Paid";
  return "Partial";
}

export default function PaymentsPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    payment_date: todayString(),
    customer_id: "",
    sale_id: "",
    amount: "",
    payment_mode: "Cash",
    reference_number: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);

    const [customersResult, salesResult, paymentsResult] =
      await Promise.all([
        supabase
          .from("customers")
          .select("id,name,mobile,opening_balance")
          .order("name", { ascending: true }),

        supabase
          .from("sales")
          .select(
            "id,invoice_number,customer_id,customer_name,total_amount,paid_amount,payment_status"
          )
          .order("sale_date", { ascending: false }),

        supabase
          .from("payments")
          .select("*")
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

    if (customersResult.error) {
      alert(customersResult.error.message);
    }

    if (salesResult.error) {
      alert(salesResult.error.message);
    }

    if (paymentsResult.error) {
      alert(paymentsResult.error.message);
    }

    setCustomers(customersResult.data || []);
    setSales(salesResult.data || []);
    setPayments(paymentsResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalReceived = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const totalOpeningBalance = customers.reduce(
    (sum, customer) => sum + Number(customer.opening_balance || 0),
    0
  );

  const customerOutstanding = useMemo(() => {
    return customers.map((customer) => {
      const customerSales = sales
        .filter((sale) => sale.customer_id === customer.id)
        .reduce(
          (sum, sale) => sum + Number(sale.total_amount || 0),
          0
        );

      const customerPayments = payments
        .filter((payment) => payment.customer_id === customer.id)
        .reduce(
          (sum, payment) => sum + Number(payment.amount || 0),
          0
        );

      const openingBalance = Number(customer.opening_balance || 0);

      const outstanding = Math.max(
        openingBalance + customerSales - customerPayments,
        0
      );

      return {
        ...customer,
        sales: customerSales,
        payments: customerPayments,
        openingBalance,
        outstanding,
      };
    });
  }, [customers, sales, payments]);

  const walkInOutstanding = useMemo(() => {
    const walkInSales = sales
      .filter((sale) => !sale.customer_id)
      .reduce(
        (sum, sale) => sum + Number(sale.total_amount || 0),
        0
      );

    const walkInPayments = payments
      .filter((payment) => !payment.customer_id)
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      );

    return Math.max(walkInSales - walkInPayments, 0);
  }, [sales, payments]);

  const outstanding = Math.max(
    totalOpeningBalance + totalSales - totalReceived,
    0
  );

  const selectedCustomer = customers.find(
    (customer) => customer.id === form.customer_id
  );

  const customerSales = useMemo(() => {
    if (!form.customer_id) return [];

    return sales.filter(
      (sale) =>
        sale.customer_id === form.customer_id &&
        Number(sale.total_amount || 0) >
          Number(sale.paid_amount || 0)
    );
  }, [form.customer_id, sales]);

  const selectedSale = sales.find(
    (sale) => sale.id === form.sale_id
  );

  const selectedSaleDue = selectedSale
    ? Math.max(
        Number(selectedSale.total_amount || 0) -
          Number(selectedSale.paid_amount || 0),
        0
      )
    : 0;

  const filteredPayments = payments.filter((payment) => {
    const linkedSale = payment.sale_id
      ? sales.find((sale) => sale.id === payment.sale_id)
      : null;

    const text = `
      ${payment.payment_number}
      ${payment.customer_name || ""}
      ${payment.payment_mode}
      ${payment.reference_number || ""}
      ${linkedSale?.invoice_number || ""}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function resetForm() {
    setForm({
      payment_date: todayString(),
      customer_id: "",
      sale_id: "",
      amount: "",
      payment_mode: "Cash",
      reference_number: "",
      notes: "",
    });
  }

  async function savePayment() {
    if (!form.customer_id) {
      alert("Please select customer.");
      return;
    }

    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (selectedSale) {
      if (amount > selectedSaleDue) {
        alert(
          `Payment cannot be more than sale due ${money(
            selectedSaleDue
          )}.`
        );
        return;
      }
    }

    const customer = customers.find(
      (item) => item.id === form.customer_id
    );

    if (!customer) {
      alert("Customer not found.");
      return;
    }

    const paymentNumber = `PAY-${String(
      payments.length + 1
    ).padStart(3, "0")}`;

    const { data: insertedPayment, error } = await supabase
      .from("payments")
      .insert({
        payment_number: paymentNumber,
        payment_date: form.payment_date,
        customer_id: customer.id,
        customer_name: customer.name,
        sale_id: selectedSale?.id || null,
        amount,
        payment_mode: form.payment_mode,
        reference_number:
          form.reference_number || null,
        notes: form.notes || null,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedSale && insertedPayment) {
      const newPaidAmount =
        Number(selectedSale.paid_amount || 0) + amount;

      const newStatus = getPaymentStatus(
        Number(selectedSale.total_amount || 0),
        newPaidAmount
      );

      const { error: saleUpdateError } = await supabase
        .from("sales")
        .update({
          paid_amount: newPaidAmount,
          payment_status: newStatus,
        })
        .eq("id", selectedSale.id);

      if (saleUpdateError) {
        await supabase
          .from("payments")
          .delete()
          .eq("id", insertedPayment.id);

        alert(saleUpdateError.message);
        return;
      }
    }

    resetForm();
    setShowModal(false);
    await loadData();
  }

  async function deletePayment(payment: Payment) {
    if (
      !confirm(
        `Delete payment ${payment.payment_number}?`
      )
    ) {
      return;
    }

    if (payment.sale_id) {
      const sale = sales.find(
        (item) => item.id === payment.sale_id
      );

      if (sale) {
        const newPaidAmount = Math.max(
          Number(sale.paid_amount || 0) -
            Number(payment.amount || 0),
          0
        );

        const newStatus = getPaymentStatus(
          Number(sale.total_amount || 0),
          newPaidAmount
        );

        const { error: saleUpdateError } = await supabase
          .from("sales")
          .update({
            paid_amount: newPaidAmount,
            payment_status: newStatus,
          })
          .eq("id", sale.id);

        if (saleUpdateError) {
          alert(saleUpdateError.message);
          return;
        }
      }
    }

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

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
                href === "/payments"
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
        <header className="border-b bg-white">
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Payments</h2>
              <p className="text-sm text-slate-500">
                Manage customer receipts and outstanding balances.
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + Receive Payment
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
                Opening Balance
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {money(totalOpeningBalance)}
              </p>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <p className="text-sm text-slate-500">
                Outstanding
              </p>
              <p className="mt-2 text-2xl font-bold text-rose-600">
                {money(outstanding)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="border-b p-5">
              <h3 className="font-bold">Customer Outstanding</h3>
              <p className="text-sm text-slate-500">
                Opening balance + sales − received payments
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Opening</th>
                    <th className="px-5 py-4">Sales</th>
                    <th className="px-5 py-4">Received</th>
                    <th className="px-5 py-4">Outstanding</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {customerOutstanding
                    .filter(
                      (customer) => customer.outstanding > 0
                    )
                    .map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {customer.name}
                          </p>

                          {customer.mobile && (
                            <p className="text-xs text-slate-500">
                              {customer.mobile}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-amber-600">
                          {money(customer.openingBalance)}
                        </td>

                        <td className="px-5 py-4">
                          {money(customer.sales)}
                        </td>

                        <td className="px-5 py-4 text-emerald-600">
                          {money(customer.payments)}
                        </td>

                        <td className="px-5 py-4 font-bold text-rose-600">
                          {money(customer.outstanding)}
                        </td>
                      </tr>
                    ))}

                  {walkInOutstanding > 0 && (
                    <tr className="bg-slate-50">
                      <td className="px-5 py-4 font-semibold">
                        Walk-in / Unassigned
                      </td>
                      <td className="px-5 py-4">-</td>
                      <td className="px-5 py-4">-</td>
                      <td className="px-5 py-4">-</td>
                      <td className="px-5 py-4 font-bold text-rose-600">
                        {money(walkInOutstanding)}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    customerOutstanding.filter(
                      (customer) => customer.outstanding > 0
                    ).length === 0 &&
                    walkInOutstanding === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No outstanding customer payments.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">Payment History</h3>
                <p className="text-sm text-slate-500">
                  All received payments
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payment, customer or invoice..."
                className="rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Payment No.</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Mode</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const linkedSale = payment.sale_id
                        ? sales.find(
                            (sale) =>
                              sale.id === payment.sale_id
                          )
                        : null;

                      return (
                        <tr
                          key={payment.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {payment.payment_number}
                          </td>

                          <td className="px-5 py-4">
                            {payment.payment_date}
                          </td>

                          <td className="px-5 py-4">
                            {payment.customer_name || "Unknown"}
                          </td>

                          <td className="px-5 py-4">
                            {linkedSale?.invoice_number || "Customer Receipt"}
                          </td>

                          <td className="px-5 py-4">
                            {payment.payment_mode}
                          </td>

                          <td className="px-5 py-4 font-bold text-emerald-600">
                            {money(Number(payment.amount))}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() =>
                                deletePayment(payment)
                              }
                              className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
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
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h3 className="text-lg font-bold">
                  Receive Payment
                </h3>

                <p className="text-sm text-slate-500">
                  Add customer payment
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Date
                </label>

                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      payment_date: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Customer
                </label>

                <select
                  value={form.customer_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_id: e.target.value,
                      sale_id: "",
                    })
                  }
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select Customer</option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="text-slate-500">
                    Current customer outstanding:
                  </span>{" "}
                  <span className="font-bold text-rose-600">
                    {money(
                      Math.max(
                        Number(
                          selectedCustomer.opening_balance || 0
                        ) +
                          sales
                            .filter(
                              (sale) =>
                                sale.customer_id ===
                                selectedCustomer.id
                            )
                            .reduce(
                              (sum, sale) =>
                                sum +
                                Number(
                                  sale.total_amount || 0
                                ),
                              0
                            ) -
                          payments
                            .filter(
                              (payment) =>
                                payment.customer_id ===
                                selectedCustomer.id
                            )
                            .reduce(
                              (sum, payment) =>
                                sum +
                                Number(payment.amount || 0),
                              0
                            ),
                        0
                      )
                    )}
                  </span>
                </div>
              )}

              {form.customer_id && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Against Invoice
                  </label>

                  <select
                    value={form.sale_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sale_id: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Customer-level Receipt
                    </option>

                    {customerSales.map((sale) => {
                      const due = Math.max(
                        Number(sale.total_amount || 0) -
                          Number(sale.paid_amount || 0),
                        0
                      );

                      return (
                        <option
                          key={sale.id}
                          value={sale.id}
                        >
                          {sale.invoice_number} — Due{" "}
                          {money(due)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {selectedSale && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Invoice Total</span>
                    <span className="font-semibold">
                      {money(
                        Number(selectedSale.total_amount)
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex justify-between">
                    <span>Already Received</span>
                    <span className="font-semibold text-emerald-600">
                      {money(
                        Number(selectedSale.paid_amount)
                      )}
                    </span>
                  </div>

                  <div className="mt-1 flex justify-between">
                    <span>Due</span>
                    <span className="font-bold text-rose-600">
                      {money(selectedSaleDue)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Enter amount"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
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
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Reference Number
                </label>

                <input
                  value={form.reference_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reference_number: e.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
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
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <button
                onClick={savePayment}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
