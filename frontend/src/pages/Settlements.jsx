import { useCallback, useEffect, useState } from "react";
import {
  calculateGroupSettlementData,
  DEFAULT_GROUP_MEMBERS,
  markSettlementPaid,
  readGroupSettlementRecords,
  saveSettlementAmountAdjustment,
} from "../utils/settlements";

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

function loadSettlements() {
  const groups = readJson("splitzy-groups", []);
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.flatMap((group) => {
    const members = readJson(
      `splitzy-members-${group.id}`,
      DEFAULT_GROUP_MEMBERS
    );
    const expenses = readJson(`splitzy-expenses-${group.id}`, []);
    const { settlements } = calculateGroupSettlementData({
      groupId: group.id,
      groupName: group.name,
      members: Array.isArray(members) ? members : DEFAULT_GROUP_MEMBERS,
      expenses: Array.isArray(expenses) ? expenses : [],
      settlementRecords: readGroupSettlementRecords(group.id),
    });

    return settlements;
  });
}

function Settlements() {
  const [settlements, setSettlements] = useState(loadSettlements);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [editType, setEditType] = useState("add");
  const [editAmount, setEditAmount] = useState("");

  const refreshSettlements = useCallback(() => {
    setSettlements(loadSettlements());
  }, []);

  useEffect(() => {
    window.addEventListener("storage", refreshSettlements);
    window.addEventListener("focus", refreshSettlements);

    return () => {
      window.removeEventListener("storage", refreshSettlements);
      window.removeEventListener("focus", refreshSettlements);
    };
  }, [refreshSettlements]);

  const handleMarkPaid = (settlement) => {
    markSettlementPaid(settlement.groupId, settlement.id);
    refreshSettlements();
  };

  const editAmountValue = Number(editAmount);
  const previewAmount = editingSettlement
    ? editingSettlement.amount +
      (editType === "add" ? editAmountValue : -editAmountValue)
    : 0;

  const handleOpenEdit = (settlement) => {
    setEditingSettlement(settlement);
    setEditType("add");
    setEditAmount("");
  };

  const handleCloseEdit = () => {
    setEditingSettlement(null);
    setEditAmount("");
  };

  const handleSaveEdit = (event) => {
    event.preventDefault();

    if (
      !editingSettlement ||
      !Number.isFinite(editAmountValue) ||
      editAmountValue <= 0 ||
      previewAmount <= 0
    ) {
      return;
    }

    saveSettlementAmountAdjustment(
      editingSettlement.groupId,
      editingSettlement.id,
      previewAmount
    );
    handleCloseEdit();
    refreshSettlements();
  };

  const groups = readJson("splitzy-groups", []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Settlements</h1>
        <p className="mt-2 text-gray-600">
          Track and mark group payments as paid.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No groups yet. Create a group to track settlements.</p>
        </div>
      ) : settlements.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-semibold text-gray-800">
            Everyone is settled up 🎉
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlements.map((settlement) => (
            <article
              key={`${settlement.groupId}-${settlement.id}`}
              className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-blue-600">
                  {settlement.groupName}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-gray-800">
                  {settlement.from} owes {settlement.to}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                <p className="text-lg font-bold text-gray-800">
                  ₹{settlement.amount.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(settlement)}
                    className="rounded-lg border border-blue-200 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPaid(settlement)}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-2xl font-bold text-gray-800">
              Edit Settlement
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Change the amount while keeping the payer and receiver the same.
            </p>

            <div className="mt-5 space-y-3 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Payer: <span className="font-semibold text-gray-800">{editingSettlement.from}</span>
              </p>
              <p className="text-sm text-gray-600">
                Receiver: <span className="font-semibold text-gray-800">{editingSettlement.to}</span>
              </p>
              <p className="text-sm text-gray-600">
                Current amount: <span className="font-semibold text-gray-800">₹{editingSettlement.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </p>
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Adjustment
              </legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="editType"
                    value="add"
                    checked={editType === "add"}
                    onChange={() => setEditType("add")}
                  />
                  Add Expense
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="editType"
                    value="deduct"
                    checked={editType === "deduct"}
                    onChange={() => setEditType("deduct")}
                  />
                  Deduct Expense
                </label>
              </div>
            </fieldset>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              Adjustment amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="Enter amount"
                required
              />
            </label>

            <div className="mt-4 rounded-lg bg-blue-50 p-4" aria-live="polite">
              <p className="text-sm text-blue-800">
                Current: ₹{editingSettlement.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              {editAmount && Number.isFinite(editAmountValue) && editAmountValue > 0 ? (
                <>
                  <p className="mt-1 text-sm text-blue-800">
                    {editType === "add" ? "Add" : "Deduct"}: ₹{editAmountValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-2 font-semibold text-blue-900">
                    New amount: ₹{previewAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                  {previewAmount <= 0 && (
                    <p className="mt-1 text-sm text-red-700" role="alert">
                      The settlement amount must remain greater than zero.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-blue-700">
                  Enter an amount to preview the updated settlement.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editAmount || !Number.isFinite(editAmountValue) || editAmountValue <= 0 || previewAmount <= 0}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Settlements;
