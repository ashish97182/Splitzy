import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi } from "../services/api";

async function loadExpenses() {
  const savedGroups = await groupsApi.list();
  const allExpenses = await Promise.all(savedGroups.map(async (group) => {
    const groupExpenses = await groupsApi.expenses(group.id);
    return groupExpenses.map((expense) => ({
      id: expense.id,
      groupId: group.id,
      groupName: group.name,
      name: expense.description,
      amount: Number(expense.amount),
      category: expense.category,
      paidBy: expense.users?.name || "Unknown user",
      splitBetween: (expense.expense_splits || []).map((split) => split.users?.name || "Unknown user"),
    }));
  }));
  return { groups: savedGroups, expenses: allExpenses.flat().sort((a, b) => b.id.localeCompare(a.id)) };
}

function Expenses() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshExpenses = useCallback(async () => {
    const result = await loadExpenses();
    setGroups(result.groups);
    setExpenses(result.expenses);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadExpenses).then((result) => {
      if (active) { setGroups(result.groups); setExpenses(result.expenses); }
    }).catch((requestError) => { if (active) setError(requestError.response?.data?.error || "Unable to load expenses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete “${expense.name}” from ${expense.groupName}?`)) return;
    setError("");
    try {
      await groupsApi.removeExpense(expense.groupId, expense.id);
      await refreshExpenses();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to delete this expense.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Expenses</h1><p className="mt-2 text-gray-600">View expenses across all your groups.</p></div>
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-xl bg-white p-8 text-center shadow-sm">Loading expenses…</div> : groups.length === 0 ? <div className="rounded-xl bg-white p-8 text-center shadow-sm"><p className="text-gray-500">No groups yet. Create a group to start tracking expenses.</p></div> : expenses.length === 0 ? <div className="rounded-xl bg-white p-8 text-center shadow-sm"><p className="text-gray-500">No expenses have been added to your groups yet.</p></div> : (
        <div className="space-y-4">{expenses.map((expense) => <article key={`${expense.groupId}-${expense.id}`} className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold text-gray-800">{expense.name}</h2><p className="mt-1 text-sm text-gray-500">{expense.groupName} · Paid by {expense.paidBy}</p><p className="mt-2 text-sm text-gray-600">Split between: {expense.splitBetween.length ? expense.splitBetween.join(", ") : "No members"}</p></div><div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end"><p className="text-lg font-bold text-gray-800">₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p><button type="button" onClick={() => navigate(`/groups/${expense.groupId}`)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Edit</button><button type="button" onClick={() => handleDelete(expense)} className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50">Delete</button></div></article>)}</div>
      )}
    </div>
  );
}

export default Expenses;
