import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi } from "../services/api";

async function loadGroups() {
  const savedGroups = await groupsApi.list();
  return Promise.all(savedGroups.map(async (group) => {
    const [details, expenses] = await Promise.all([groupsApi.get(group.id), groupsApi.expenses(group.id)]);
    return {
      ...group,
      memberCount: (details.group_members || []).length,
      totalExpenses: expenses.filter((expense) => expense.category !== "SETTLEMENT").reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    };
  }));
}

function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(loadGroups).then((result) => { if (active) setGroups(result); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error || "Unable to load groups."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const handleCreateGroup = async () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName || isSaving) return;
    if (groups.some((group) => group.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("A group with this name already exists.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await groupsApi.create({ name: trimmedName, description: "" });
      setGroups(await loadGroups());
      setNewGroupName("");
      setIsCreateModalOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to create the group.");
    } finally { setIsSaving(false); }
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete “${group.name}” and all of its members, expenses, and settlements? This cannot be undone.`)) return;
    setError("");
    try {
      await groupsApi.remove(group.id);
      setGroups((current) => current.filter((item) => item.id !== group.id));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to delete this group.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold text-gray-800">Groups</h1><p className="mt-2 text-gray-600">Manage your groups and shared expenses.</p></div><button onClick={() => setIsCreateModalOpen(true)} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">+ Create Group</button></div>
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {isLoading ? <div className="rounded-xl bg-white p-8 text-center shadow-sm">Loading groups…</div> : groups.length === 0 ? <div className="rounded-xl bg-white p-8 text-center shadow-sm"><p className="text-gray-500">No groups created yet.</p></div> : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{groups.map((group) => <div key={group.id} className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-bold text-gray-800">{group.name}</h2><p className="mt-1 text-sm text-gray-500">Group #{group.id}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">{group.name.charAt(0)}</div></div><div className="grid grid-cols-2 gap-4"><div className="rounded-lg bg-gray-50 p-4"><p className="text-sm text-gray-500">Members</p><p className="mt-1 text-2xl font-bold text-gray-800">{group.memberCount}</p></div><div className="rounded-lg bg-gray-50 p-4"><p className="text-sm text-gray-500">Expenses</p><p className="mt-1 text-2xl font-bold text-gray-800">₹{group.totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p></div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row"><button onClick={() => navigate(`/groups/${group.id}`)} className="w-full flex-1 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 sm:w-auto">Open Group</button><button type="button" onClick={() => handleDeleteGroup(group)} className="w-full rounded-lg border border-red-200 px-4 py-3 font-medium text-red-600 hover:bg-red-50 sm:w-auto" aria-label={`Delete ${group.name} group`}>Delete</button></div></div>)}</div>
      )}
      {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><h2 className="text-2xl font-bold text-gray-800">Create New Group</h2><p className="mt-1 text-sm text-gray-500">Give your new group a name.</p><div className="mt-5"><label htmlFor="new-group-name" className="mb-2 block text-sm font-medium text-gray-700">Group Name</label><input id="new-group-name" type="text" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleCreateGroup(); }} placeholder="e.g. Goa Trip" autoFocus className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" /></div><div className="mt-6 flex justify-end gap-3"><button onClick={() => { setNewGroupName(""); setIsCreateModalOpen(false); }} className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button disabled={isSaving} onClick={handleCreateGroup} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Creating…" : "Create Group"}</button></div></div></div>}
    </div>
  );
}

export default Groups;
