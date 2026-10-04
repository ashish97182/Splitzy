import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import BalanceCard from "../components/dashboard/BalanceCard";
import ExpenseList from "../components/dashboard/ExpenseList";
import SettlementList from "../components/dashboard/SettlementList";
import MemberList from "../components/dashboard/MemberList";
import {
  calculateGroupSettlementData,
  DEFAULT_GROUP_MEMBERS,
  markSettlementPaid,
  readGroupSettlementRecords,
} from "../utils/settlements";

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

function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const membersStorageKey = `splitzy-members-${groupId}`;
  const expensesStorageKey = `splitzy-expenses-${groupId}`;
  const settlementsStorageKey = `splitzy-settlements-${groupId}`;

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("Nishant");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberRemovalMessage, setMemberRemovalMessage] = useState("");

  const [members, setMembers] = useState(() => {
    const savedMembers = localStorage.getItem(membersStorageKey);

    return savedMembers
      ? JSON.parse(savedMembers)
      : defaultMembers;
  });

  const [selectedMembers, setSelectedMembers] =
    useState(defaultMembers);

  const [expenses, setExpenses] = useState(() => {
    const savedExpenses = localStorage.getItem(expensesStorageKey);

    return savedExpenses
      ? JSON.parse(savedExpenses)
      : ["1", "2", "3"].includes(String(groupId))
        ? defaultExpenses
        : [];
  });

  const [paidSettlements, setPaidSettlements] = useState(() => {
    return readGroupSettlementRecords(groupId);
  });

  const savedGroups = localStorage.getItem("splitzy-groups");
  const groups = savedGroups
    ? JSON.parse(savedGroups)
    : defaultGroups;
  const group = groups.find(
    (savedGroup) => String(savedGroup.id) === String(groupId)
  );

  /*
    Save members whenever they change
  */
  useEffect(() => {
    localStorage.setItem(
      membersStorageKey,
      JSON.stringify(members)
    );
  }, [members, membersStorageKey]);

  /*
    Save expenses whenever they change
  */
  useEffect(() => {
    localStorage.setItem(
      expensesStorageKey,
      JSON.stringify(expenses)
    );
  }, [expenses, expensesStorageKey]);

  /*
    Save paid settlements whenever they change
  */
  useEffect(() => {
    localStorage.setItem(
      settlementsStorageKey,
      JSON.stringify(paidSettlements)
    );
  }, [paidSettlements, settlementsStorageKey]);

  useEffect(() => {
    const syncSettlementRecords = (event) => {
      if (event.key !== settlementsStorageKey) {
        return;
      }

      try {
        const records = event.newValue ? JSON.parse(event.newValue) : [];
        setPaidSettlements(Array.isArray(records) ? records : []);
      } catch {
        setPaidSettlements([]);
      }
    };

    window.addEventListener("storage", syncSettlementRecords);
    return () => window.removeEventListener("storage", syncSettlementRecords);
  }, [settlementsStorageKey]);

  /*
    Keep selected members synced with current members
  */
  useEffect(() => {
    setSelectedMembers(members);
  }, [members]);

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Group Not Found
        </h1>

        <button
          onClick={() => navigate("/groups")}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );

  const { balances, settlements } = calculateGroupSettlementData({
    groupId,
    groupName: group.name,
    members,
    expenses,
    settlementRecords: paidSettlements,
  });
  const yourBalance = balances.Nishant || 0;

  const splitAmount =
    selectedMembers.length > 0 && expenseAmount
      ? Number(expenseAmount) / selectedMembers.length
      : 0;

  /*
    Toggle split member
  */
  const handleMemberToggle = (member) => {
    setSelectedMembers((currentMembers) => {
      if (currentMembers.includes(member)) {
        return currentMembers.filter(
          (currentMember) => currentMember !== member
        );
      }

      return [...currentMembers, member];
    });
  };

  /*
    Add expense
  */
  const resetExpenseForm = () => {
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy(members[0] || "Nishant");
    setSelectedMembers(members);
    setEditingExpenseId(null);
  };

  const handleOpenAddExpense = () => {
    resetExpenseForm();
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseName(expense.name);
    setExpenseAmount(String(expense.amount));
    setPaidBy(expense.paidBy);
    setSelectedMembers(expense.splitBetween);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = () => {
    if (
      !expenseName.trim() ||
      !expenseAmount ||
      Number(expenseAmount) <= 0 ||
      selectedMembers.length === 0
    ) {
      return;
    }

    const expenseDetails = {
      name: expenseName.trim(),
      amount: Number(expenseAmount),
      paidBy,
      splitBetween: [...selectedMembers],
    };

    if (editingExpenseId !== null) {
      setExpenses((currentExpenses) =>
        currentExpenses.map((expense) =>
          expense.id === editingExpenseId
            ? { ...expense, ...expenseDetails }
            : expense
        )
      );
    } else {
      setExpenses((currentExpenses) => [
        ...currentExpenses,
        { id: Date.now(), ...expenseDetails },
      ]);
    }

    resetExpenseForm();
    setIsExpenseModalOpen(false);
  };

  const handleCloseExpenseModal = () => {
    resetExpenseForm();
    setIsExpenseModalOpen(false);
  };

  /*
    Add member
  */
  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();

    if (!trimmedName) {
      return;
    }

    const alreadyExists = members.some(
      (member) =>
        member.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      return;
    }

    setMembers((currentMembers) => [
      ...currentMembers,
      trimmedName,
    ]);

    setNewMemberName("");
    setIsMemberModalOpen(false);
  };

  /*
    Remove member
  */
  const handleRemoveMember = (memberToRemove) => {
    if (memberToRemove === "Nishant") {
      setMemberRemovalMessage("Nishant is the group owner and cannot be removed.");
      return;
    }

    const relatedExpense = expenses.find(
      (expense) =>
        expense.paidBy === memberToRemove ||
        expense.splitBetween.includes(memberToRemove)
    );

    if (relatedExpense) {
      setMemberRemovalMessage(
        `Cannot remove ${memberToRemove} because they are associated with the expense “${relatedExpense.name}”. Remove that expense first.`
      );
      return;
    }

    setMemberRemovalMessage("");

    setMembers((currentMembers) =>
      currentMembers.filter(
        (member) => member !== memberToRemove
      )
    );

    setSelectedMembers((currentMembers) =>
      currentMembers.filter(
        (member) => member !== memberToRemove
      )
    );

    if (paidBy === memberToRemove) {
      setPaidBy("Nishant");
    }
  };

  const handleRemoveExpense = (expenseToRemove) => {
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.id !== expenseToRemove.id)
    );
    setMemberRemovalMessage("");
  };

  /*
    Mark settlement as paid
  */
  const handleMarkPaid = (settlementId) => {
    setPaidSettlements(
      markSettlementPaid(groupId, settlementId)
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate("/groups")}
        className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Back to Groups
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          {group.name}
        </h1>

        <p className="mt-2 text-gray-600">
          Manage expenses and track balances
        </p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">
            Total Expenses
          </h2>

          <p className="mt-2 text-3xl font-bold text-gray-800">
            ₹{totalExpenses.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">
            Members
          </h2>

          <p className="mt-2 text-3xl font-bold text-gray-800">
            {members.length}
          </p>
        </div>

        <BalanceCard balance={yourBalance} />
      </div>

      {/* Members */}
      <div className="mb-8">
        {memberRemovalMessage && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {memberRemovalMessage}
          </p>
        )}
        <MemberList
          members={members}
          onAddMember={() => setIsMemberModalOpen(true)}
          onRemoveMember={handleRemoveMember}
        />
      </div>

      {/* Expenses */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Recent Expenses
          </h2>

          <button
            onClick={handleOpenAddExpense}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            + Add Expense
          </button>
        </div>

        <ExpenseList
          expenses={expenses}
          onEditExpense={handleEditExpense}
          onRemoveExpense={handleRemoveExpense}
        />
      </div>

      {/* Settlements */}
      <SettlementList
        settlements={settlements}
        onMarkPaid={handleMarkPaid}
      />

      {/* Add Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800">
              Add Member
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add someone to this group.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Member Name
              </label>

              <input
                type="text"
                value={newMemberName}
                onChange={(e) =>
                  setNewMemberName(e.target.value)
                }
                placeholder="e.g. Amit"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setNewMemberName("");
                  setIsMemberModalOpen(false);
                }}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleAddMember}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingExpenseId !== null ? "Edit Expense" : "Add Expense"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add an expense and choose who should split it.
            </p>

            {/* Expense Name */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expense Name
              </label>

              <input
                type="text"
                value={expenseName}
                onChange={(e) =>
                  setExpenseName(e.target.value)
                }
                placeholder="e.g. Dinner"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Amount */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Amount
              </label>

              <input
                type="number"
                value={expenseAmount}
                onChange={(e) =>
                  setExpenseAmount(e.target.value)
                }
                placeholder="e.g. 1600"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Paid By */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Paid By
              </label>

              <select
                value={paidBy}
                onChange={(e) =>
                  setPaidBy(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                {members.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Between */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Split Between
              </label>

              <div className="space-y-2">
                {members.map((member) => (
                  <label
                    key={member}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member)}
                      onChange={() =>
                        handleMemberToggle(member)
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm text-gray-700">
                      {member}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            {selectedMembers.length > 0 &&
              expenseAmount && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-700">
                    Each selected member pays{" "}
                    <span className="font-bold">
                      ₹
                      {splitAmount.toLocaleString(
                        "en-IN"
                      )}
                    </span>
                  </p>
                </div>
              )}

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  handleCloseExpenseModal()
                }
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveExpense}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                {editingExpenseId !== null ? "Save Changes" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetails;
