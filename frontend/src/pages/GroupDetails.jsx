import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BalanceCard from "../components/dashboard/BalanceCard";
import ExpenseList from "../components/dashboard/ExpenseList";
import SettlementList from "../components/dashboard/SettlementList";
import MemberList from "../components/dashboard/MemberList";
import { groupsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const loadGroup = useCallback(async () => {
    const [groupData, expenseData, balanceData] = await Promise.all([
      groupsApi.get(groupId),
      groupsApi.expenses(groupId),
      groupsApi.balances(groupId),
    ]);
    const groupMembers = (groupData.group_members || []).map((membership) => ({
      id: membership.userId,
      name: membership.users?.name || "Unknown user",
      email: membership.users?.email || "",
      role: membership.role,
    }));
    const memberNames = new Map(groupMembers.map((member) => [member.id, member.name]));
    const ordinaryExpenses = expenseData.filter((expense) => expense.category !== "SETTLEMENT").map((expense) => {
      const splits = expense.expense_splits || [];
      return {
        id: expense.id,
        name: expense.description,
        amount: Number(expense.amount),
        category: expense.category,
        paidById: expense.paidBy,
        paidBy: expense.users?.name || memberNames.get(expense.paidBy) || "Unknown user",
        splitMemberIds: splits.map((split) => split.userId),
        splitBetween: splits.map((split) => split.users?.name || memberNames.get(split.userId) || "Unknown user"),
      };
    });
    return {
      group: groupData,
      members: groupMembers,
      expenses: ordinaryExpenses,
      balanceSummary: balanceData.summary || [],
      settlements: (balanceData.transactions || []).map((transaction) => ({
        id: `${transaction.from}-${transaction.to}`,
        groupId,
        fromId: transaction.from,
        from: transaction.fromName,
        toId: transaction.to,
        to: transaction.toName,
        amount: Number(transaction.amount),
      })),
    };
  }, [groupId]);

  const applyGroupData = (data) => {
    setGroup(data.group);
    setMembers(data.members);
    setExpenses(data.expenses);
    setBalanceSummary(data.balanceSummary);
    setSettlements(data.settlements);
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadGroup).then((data) => { if (active) applyGroupData(data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error || "Unable to load this group."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [loadGroup]);

  const yourBalance = useMemo(() => Number(balanceSummary.find((row) => row.userId === user?.id)?.netBalance || 0), [balanceSummary, user?.id]);
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const splitAmount = selectedMembers.length && expenseAmount ? Number(expenseAmount) / selectedMembers.length : 0;

  const resetExpenseForm = () => {
    setExpenseName("");
    setExpenseAmount("");
    setPaidBy(user?.id || members[0]?.id || "");
    setSelectedMembers(members.map((member) => member.id));
    setEditingExpenseId(null);
  };

  const handleOpenAddExpense = () => { resetExpenseForm(); setError(""); setIsExpenseModalOpen(true); };
  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseName(expense.name);
    setExpenseAmount(String(expense.amount));
    setPaidBy(expense.paidById);
    setSelectedMembers(expense.splitMemberIds);
    setError("");
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseName.trim() || !Number.isFinite(Number(expenseAmount)) || Number(expenseAmount) <= 0 || !paidBy || !selectedMembers.length || isSaving) {
      setError("Enter a name and valid amount, choose a payer, and select at least one member.");
      return;
    }
    setIsSaving(true);
    setError("");
    const payload = {
      description: expenseName.trim(),
      amount: Number(expenseAmount),
      category: "GENERAL",
      splitType: "EQUAL",
      paidBy,
      splits: selectedMembers.map((userId) => ({ userId })),
    };
    try {
      if (editingExpenseId) await groupsApi.updateExpense(groupId, editingExpenseId, payload);
      else await groupsApi.addExpense(groupId, payload);
      applyGroupData(await loadGroup());
      setIsExpenseModalOpen(false);
      resetExpenseForm();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to save the expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    const email = newMemberEmail.trim();
    if (!email || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await groupsApi.addMember(groupId, email);
      applyGroupData(await loadGroup());
      setNewMemberEmail("");
      setIsMemberModalOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to add this member. They may need to register first.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    setError("");
    try {
      await groupsApi.removeMember(groupId, member.id);
      applyGroupData(await loadGroup());
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to remove this member.");
    }
  };

  const handleRemoveExpense = async (expense) => {
    if (!window.confirm(`Remove “${expense.name}” from this group?`)) return;
    setError("");
    try {
      await groupsApi.removeExpense(groupId, expense.id);
      applyGroupData(await loadGroup());
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to remove this expense.");
    }
  };

  const handleMarkPaid = async (settlement) => {
    if (settlement.fromId !== user?.id) return;
    setError("");
    try {
      await groupsApi.recordPayment(groupId, settlement.toId, settlement.amount);
      applyGroupData(await loadGroup());
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to record this payment.");
    }
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
  };

  if (isLoading) return <div className="min-h-screen p-8">Loading group…</div>;
  if (!group) return <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8"><h1 className="text-3xl font-bold text-gray-800">Group Not Found</h1><p role="alert" className="mt-3 text-red-700">{error}</p><button onClick={() => navigate("/groups")} className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">Back to Groups</button></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <button onClick={() => navigate("/groups")} className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-800">← Back to Groups</button>
      <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">{group.name}</h1><p className="mt-2 text-gray-600">Manage expenses and track balances</p></div>
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-sm font-medium text-gray-500">Total Expenses</h2><p className="mt-2 text-3xl font-bold text-gray-800">₹{totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p></div>
        <div className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-sm font-medium text-gray-500">Members</h2><p className="mt-2 text-3xl font-bold text-gray-800">{members.length}</p></div>
        <BalanceCard balance={yourBalance} />
      </div>
      <div className="mb-8"><MemberList members={members} onAddMember={() => { setError(""); setIsMemberModalOpen(true); }} onRemoveMember={handleRemoveMember} /></div>
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xl font-semibold text-gray-800">Recent Expenses</h2><button onClick={handleOpenAddExpense} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">+ Add Expense</button></div>
        <ExpenseList expenses={expenses} onEditExpense={handleEditExpense} onRemoveExpense={handleRemoveExpense} />
      </div>
      <SettlementList settlements={settlements} currentUserId={user?.id} onMarkPaid={handleMarkPaid} />

      {isMemberModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><h2 className="text-2xl font-bold text-gray-800">Add Member</h2><p className="mt-1 text-sm text-gray-500">Invite an existing DostiDue user by email.</p><div className="mt-5"><label htmlFor="member-email" className="mb-2 block text-sm font-medium text-gray-700">Member Email</label><input id="member-email" type="email" value={newMemberEmail} onChange={(event) => setNewMemberEmail(event.target.value)} placeholder="friend@example.com" className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" /></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => { setNewMemberEmail(""); setIsMemberModalOpen(false); }} className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button disabled={isSaving} onClick={handleAddMember} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Adding…" : "Add Member"}</button></div></div></div>}

      {isExpenseModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800">{editingExpenseId ? "Edit Expense" : "Add Expense"}</h2><p className="mt-1 text-sm text-gray-500">Add an expense and choose who should split it.</p>
        <div className="mt-5"><label htmlFor="expense-name" className="mb-2 block text-sm font-medium text-gray-700">Expense Name</label><input id="expense-name" type="text" value={expenseName} onChange={(event) => setExpenseName(event.target.value)} placeholder="e.g. Dinner" className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" /></div>
        <div className="mt-4"><label htmlFor="expense-amount" className="mb-2 block text-sm font-medium text-gray-700">Amount</label><input id="expense-amount" type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="e.g. 1600" className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" /></div>
        <div className="mt-4"><label htmlFor="expense-payer" className="mb-2 block text-sm font-medium text-gray-700">Paid By</label><select id="expense-payer" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
        <div className="mt-4"><p className="mb-2 block text-sm font-medium text-gray-700">Split Between</p><div className="space-y-2">{members.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3"><input type="checkbox" checked={selectedMembers.includes(member.id)} onChange={() => handleMemberToggle(member.id)} className="h-4 w-4" /><span className="text-sm text-gray-700">{member.name}</span></label>)}</div></div>
        {selectedMembers.length > 0 && expenseAmount && <div className="mt-4 rounded-lg bg-blue-50 p-3"><p className="text-sm text-blue-700">Each selected member pays <span className="font-bold">₹{splitAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></p></div>}
        <div className="mt-6 flex justify-end gap-3"><button onClick={() => { setIsExpenseModalOpen(false); resetExpenseForm(); }} className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button disabled={isSaving} onClick={handleSaveExpense} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Saving…" : editingExpenseId ? "Save Changes" : "Add Expense"}</button></div>
      </div></div>}
    </div>
  );
}

export default GroupDetails;

