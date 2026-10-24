import { useEffect, useState } from "react";
import { groupsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ groups: 0, totalExpenses: 0, balance: 0, owed: 0, owing: 0, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const groups = await groupsApi.list();
      const perGroup = await Promise.all(groups.map(async (group) => {
        const [expenses, balances] = await Promise.all([groupsApi.expenses(group.id), groupsApi.balances(group.id)]);
        return { group, expenses: expenses.filter((expense) => expense.category !== "SETTLEMENT"), balances };
      }));
      const allExpenses = perGroup.flatMap(({ group, expenses }) => expenses.map((expense) => ({
        id: expense.id,
        name: expense.description,
        amount: Number(expense.amount),
        groupId: group.id,
        groupName: group.name,
        paidBy: expense.users?.name || "Unknown user",
        date: new Date(expense.createdAt || 0).getTime(),
      })));
      const totals = perGroup.reduce((summary, { balances }) => {
        const ownBalance = balances.summary?.find((row) => row.userId === user?.id)?.netBalance || 0;
        summary.balance += Number(ownBalance);
        (balances.transactions || []).forEach((transaction) => {
          if (transaction.from === user?.id) summary.owing += Number(transaction.amount);
          if (transaction.to === user?.id) summary.owed += Number(transaction.amount);
        });
        return summary;
      }, { balance: 0, owed: 0, owing: 0 });
      allExpenses.sort((a, b) => b.date - a.date);
      if (active) setData({ groups: groups.length, totalExpenses: allExpenses.reduce((sum, expense) => sum + expense.amount, 0), ...totals, recent: allExpenses.slice(0, 5) });
    };
    load().catch((requestError) => { if (active) setError(requestError.response?.data?.error || "Unable to load dashboard data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const stats = [
    { label: "Total Groups", value: data.groups },
    { label: "Total Expenses", value: formatCurrency(data.totalExpenses) },
    { label: "My Balance", value: formatCurrency(data.balance) },
    { label: "Amount I Owe", value: formatCurrency(data.owing) },
    { label: "Owed to Me", value: formatCurrency(data.owed) },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800">Your Dashboard</h1><p className="mt-2 text-gray-600">Welcome to your DostiDue dashboard.</p>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-8 rounded-xl bg-white p-6 text-center">Loading your data…</p> : <>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">{stats.map((stat) => <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-sm font-medium text-gray-500">{stat.label}</h2><p className="mt-2 text-2xl font-bold text-gray-800">{stat.value}</p></div>)}</div>
        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-gray-800">Recent Expenses</h2>{data.recent.length === 0 ? <p className="py-8 text-center text-gray-500">No expenses added yet.</p> : <div className="mt-4 space-y-4">{data.recent.map((expense) => <div key={`${expense.groupId}-${expense.id}`} className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:gap-4"><div><h3 className="font-semibold text-gray-800">{expense.name}</h3><p className="text-sm text-gray-500">{expense.groupName} · Paid by {expense.paidBy}</p></div><p className="shrink-0 text-lg font-bold text-gray-800">{formatCurrency(expense.amount)}</p></div>)}</div>}</section>
      </>}
    </div>
  );
}

export default Dashboard;
