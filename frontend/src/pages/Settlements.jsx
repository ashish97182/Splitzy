import { useCallback, useEffect, useState } from "react";
import { groupsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

async function loadSettlements() {
  const savedGroups = await groupsApi.list();
  const groupSettlements = await Promise.all(savedGroups.map(async (group) => {
    const balances = await groupsApi.balances(group.id);
    return (balances.transactions || []).map((transaction) => ({
      id: `${group.id}-${transaction.from}-${transaction.to}`,
      groupId: group.id,
      groupName: group.name,
      fromId: transaction.from,
      from: transaction.fromName,
      toId: transaction.to,
      to: transaction.toName,
      amount: Number(transaction.amount),
    }));
  }));
  return { groups: savedGroups, settlements: groupSettlements.flat() };
}

function Settlements() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);

  const refreshSettlements = useCallback(async () => {
    const result = await loadSettlements();
    setGroups(result.groups);
    setSettlements(result.settlements);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadSettlements).then((result) => {
      if (active) { setGroups(result.groups); setSettlements(result.settlements); }
    }).catch((requestError) => { if (active) setError(requestError.response?.data?.error || "Unable to load settlements."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleMarkPaid = async (settlement) => {
    if (settlement.fromId !== user?.id || payingId) return;
    setPayingId(settlement.id);
    setError("");
    try {
      await groupsApi.recordPayment(settlement.groupId, settlement.toId, settlement.amount);
      await refreshSettlements();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to record this payment.");
    } finally { setPayingId(null); }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Settlements</h1><p className="mt-2 text-gray-600">Track and mark group payments as paid.</p></div>
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-xl bg-white p-8 text-center shadow-sm">Loading settlements…</div> : groups.length === 0 ? <div className="rounded-xl bg-white p-8 text-center shadow-sm"><p className="text-gray-500">No groups yet. Create a group to track settlements.</p></div> : settlements.length === 0 ? <div className="rounded-xl bg-white p-8 text-center shadow-sm"><p className="text-xl font-semibold text-gray-800">Everyone is settled up 🎉</p></div> : (
        <div className="space-y-4">{settlements.map((settlement) => {
          const isPayer = settlement.fromId === user?.id;
          return <article key={settlement.id} className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-blue-600">{settlement.groupName}</p><h2 className="mt-1 text-lg font-semibold text-gray-800">{settlement.from} owes {settlement.to}</h2></div><div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end"><p className="text-lg font-bold text-gray-800">₹{settlement.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p><div className="flex gap-2"><button type="button" disabled title="Outstanding settlements are calculated from expenses. The existing API has no endpoint to edit a calculated amount." className="rounded-lg border border-blue-200 px-4 py-2 font-medium text-blue-700 opacity-50">Edit</button><button type="button" disabled={!isPayer || payingId === settlement.id} title={isPayer ? "" : "Log in as the payer to record this payment."} onClick={() => handleMarkPaid(settlement)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{payingId === settlement.id ? "Saving…" : "Mark as Paid"}</button></div></div></article>;
        })}</div>
      )}
    </div>
  );
}

export default Settlements;
