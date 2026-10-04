import { useEffect, useState } from "react";
import {
  calculateGroupSettlementData,
  DEFAULT_GROUP_MEMBERS,
  readGroupSettlementRecords,
} from "../utils/settlements";

const CURRENT_USER = "Nishant";
const defaultMembers = DEFAULT_GROUP_MEMBERS;
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

function loadDashboardData() {
  const groups = readJson("splitzy-groups", defaultGroups);
  const allExpenses = [];
  let totalExpenses = 0;
  let myBalance = 0;
  let amountIOwe = 0;
  let amountOwedToMe = 0;

  groups.forEach((group) => {
    const groupId = group.id;
    const members = readJson(
      `splitzy-members-${groupId}`,
      defaultMembers
    );
    const expenses = readJson(
      `splitzy-expenses-${groupId}`,
      [1, 2, 3].includes(Number(groupId)) ? defaultExpenses : []
    );
    const { balances, settlements } = calculateGroupSettlementData({
      groupId,
      groupName: group.name,
      members,
      expenses,
      settlementRecords: readGroupSettlementRecords(groupId),
    });

    expenses.forEach((expense) => {
      const amount = Number(expense.amount) || 0;

      totalExpenses += amount;
      allExpenses.push({
        ...expense,
        amount,
        groupId,
        groupName: group.name,
      });

    });

    const ownGroupBalance = balances[CURRENT_USER] || 0;
    myBalance += ownGroupBalance;
    amountIOwe += settlements
      .filter((settlement) => settlement.from === CURRENT_USER)
      .reduce((total, settlement) => total + settlement.amount, 0);
    amountOwedToMe += settlements
      .filter((settlement) => settlement.to === CURRENT_USER)
      .reduce((total, settlement) => total + settlement.amount, 0);
  });

  allExpenses.sort((first, second) => Number(second.id) - Number(first.id));

  return {
    totalGroups: groups.length,
    totalExpenses,
    myBalance,
    amountIOwe,
    amountOwedToMe,
    recentExpenses: allExpenses.slice(0, 5),
  };
}

function formatCurrency(amount) {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(loadDashboardData);

  useEffect(() => {
    const refreshDashboard = () => setDashboardData(loadDashboardData());
    window.addEventListener("storage", refreshDashboard);
    window.addEventListener("focus", refreshDashboard);

    return () => {
      window.removeEventListener("storage", refreshDashboard);
      window.removeEventListener("focus", refreshDashboard);
    };
  }, []);

  const stats = [
    { label: "Total Groups", value: dashboardData.totalGroups },
    { label: "Total Expenses", value: formatCurrency(dashboardData.totalExpenses) },
    { label: "My Balance", value: formatCurrency(dashboardData.myBalance) },
    { label: "Amount I Owe", value: formatCurrency(dashboardData.amountIOwe) },
    { label: "Owed to Me", value: formatCurrency(dashboardData.amountOwedToMe) },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800">
        Your Dashboard
      </h1>
      <p className="mt-2 text-gray-600">
        Welcome to your Splitzy dashboard.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-sm font-medium text-gray-500">{stat.label}</h2>
            <p className="mt-2 text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Recent Expenses</h2>
        {dashboardData.recentExpenses.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No expenses added yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {dashboardData.recentExpenses.map((expense) => (
              <div
                key={`${expense.groupId}-${expense.id}`}
                className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <div>
                  <h3 className="font-semibold text-gray-800">{expense.name}</h3>
                  <p className="text-sm text-gray-500">
                    {expense.groupName} · Paid by {expense.paidBy}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-gray-800">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
