import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const defaultGroups = [
  { id: 1, name: "Goa Trip" },
  { id: 2, name: "Roommates" },
  { id: 3, name: "College Friends" },
];

const defaultExpenses = [
  {
    id: 1,
    name: "Hotel",
    amount: 5000,
    paidBy: "Nishant",
    splitBetween: ["Nishant", "Rahul", "Sumriddhi"],
  },
  {
    id: 2,
    name: "Food",
    amount: 2450,
    paidBy: "Rahul",
    splitBetween: ["Nishant", "Rahul", "Sumriddhi"],
  },
  {
    id: 3,
    name: "Travel",
    amount: 5000,
    paidBy: "Sumriddhi",
    splitBetween: ["Nishant", "Rahul", "Sumriddhi"],
  },
];

function readJson(key, fallback) {
  const value = localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadExpenses() {
  const groups = readJson("splitzy-groups", defaultGroups);

  return groups.flatMap((group) => {
    const expenses = getGroupExpenses(group.id);

    return expenses.map((expense) => ({
      ...expense,
      groupId: group.id,
      groupName: group.name,
    }));
  });
}

function getGroupExpenses(groupId) {
  const storageKey = `splitzy-expenses-${groupId}`;
  const savedExpenses = localStorage.getItem(storageKey);

  if (savedExpenses !== null) {
    try {
      return JSON.parse(savedExpenses);
    } catch {
      return [];
    }
  }

  return [1, 2, 3].includes(Number(groupId)) ? defaultExpenses : [];
}

function Expenses() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expenses, setExpenses] = useState(loadExpenses);

  const refreshExpenses = useCallback(() => {
    setExpenses(loadExpenses());
  }, []);

  useEffect(() => {
    refreshExpenses();
    window.addEventListener("storage", refreshExpenses);
    window.addEventListener("focus", refreshExpenses);

    return () => {
      window.removeEventListener("storage", refreshExpenses);
      window.removeEventListener("focus", refreshExpenses);
    };
  }, [location.key, refreshExpenses]);

  const handleDeleteExpense = (expenseToDelete) => {
    const confirmed = window.confirm(
      `Delete “${expenseToDelete.name}” from ${expenseToDelete.groupName}?`
    );

    if (!confirmed) {
      return;
    }

    const storageKey = `splitzy-expenses-${expenseToDelete.groupId}`;
    const groupExpenses = getGroupExpenses(expenseToDelete.groupId);
    const updatedExpenses = groupExpenses.filter(
      (expense) => String(expense.id) !== String(expenseToDelete.id)
    );

    localStorage.setItem(storageKey, JSON.stringify(updatedExpenses));
    refreshExpenses();
  };

  const groups = readJson("splitzy-groups", defaultGroups);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
        <p className="mt-2 text-gray-600">
          View expenses across all your groups.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No groups yet. Create a group to start tracking expenses.</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No expenses have been added to your groups yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => {
            const splitBetween = Array.isArray(expense.splitBetween)
              ? expense.splitBetween
              : [];

            return (
              <article
                key={`${expense.groupId}-${expense.id}`}
                className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {expense.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {expense.groupName} · Paid by {expense.paidBy}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Split between: {splitBetween.length ? splitBetween.join(", ") : "No members"}
                  </p>
                </div>

                <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <p className="text-lg font-bold text-gray-800">
                    ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/groups/${expense.groupId}`)}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(expense)}
                    className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Expenses;
