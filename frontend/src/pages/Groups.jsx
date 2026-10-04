import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const defaultGroups = [
  {
    id: 1,
    name: "Goa Trip",
  },
  {
    id: 2,
    name: "Roommates",
  },
  {
    id: 3,
    name: "College Friends",
  },
];

const defaultMembers = ["Nishant", "Rahul", "Sumriddhi"];

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

function Groups() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState(() => {
    const savedGroups = localStorage.getItem("splitzy-groups");

    return savedGroups
      ? JSON.parse(savedGroups)
      : defaultGroups;
  });

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [newGroupName, setNewGroupName] = useState("");

  const [, setRefresh] = useState(0);

  useEffect(() => {
    localStorage.setItem(
      "splitzy-groups",
      JSON.stringify(groups)
    );
  }, [groups]);

  useEffect(() => {
    const handleStorageChange = () => {
      setRefresh((value) => value + 1);

      const savedGroups = localStorage.getItem(
        "splitzy-groups"
      );

      if (savedGroups) {
        setGroups(JSON.parse(savedGroups));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  const getGroupData = (groupId) => {
    const membersKey = `splitzy-members-${groupId}`;
    const expensesKey = `splitzy-expenses-${groupId}`;

    const savedMembers = localStorage.getItem(membersKey);
    const savedExpenses = localStorage.getItem(expensesKey);

    const members = savedMembers
      ? JSON.parse(savedMembers)
      : defaultMembers;

    const expenses = savedExpenses
      ? JSON.parse(savedExpenses)
      : [1, 2, 3].includes(Number(groupId))
        ? defaultExpenses
        : [];

    const totalExpenses = expenses.reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );

    return {
      members,
      totalExpenses,
    };
  };

  const handleCreateGroup = () => {
    const trimmedName = newGroupName.trim();

    if (!trimmedName) {
      return;
    }

    const alreadyExists = groups.some(
      (group) =>
        group.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      alert("A group with this name already exists.");
      return;
    }

    const newGroup = {
      id: Date.now(),
      name: trimmedName,
    };

    setGroups((currentGroups) => [
      ...currentGroups,
      newGroup,
    ]);

    setNewGroupName("");
    setIsCreateModalOpen(false);
  };

  const handleCloseModal = () => {
    setNewGroupName("");
    setIsCreateModalOpen(false);
  };

  const handleDeleteGroup = (group) => {
    const confirmed = window.confirm(
      `Delete “${group.name}” and all of its members, expenses, and settlements? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(`splitzy-members-${group.id}`);
    localStorage.removeItem(`splitzy-expenses-${group.id}`);
    localStorage.removeItem(`splitzy-settlements-${group.id}`);
    setGroups((currentGroups) =>
      currentGroups.filter(
        (currentGroup) => String(currentGroup.id) !== String(group.id)
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Groups
          </h1>

          <p className="mt-2 text-gray-600">
            Manage your groups and shared expenses.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          + Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            No groups created yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const { members, totalExpenses } =
              getGroupData(group.id);

            return (
              <div
                key={group.id}
                className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {group.name}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Group #{group.id}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                    {group.name.charAt(0)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                      Members
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                      {members.length}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                      Expenses
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                      ₹{totalExpenses.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() =>
                      navigate(`/groups/${group.id}`)
                    }
                    className="w-full flex-1 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Open Group
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group)}
                    className="w-full rounded-lg border border-red-200 px-4 py-3 font-medium text-red-600 hover:bg-red-50 sm:w-auto"
                    aria-label={`Delete ${group.name} group`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800">
              Create New Group
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Give your new group a name.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Group Name
              </label>

              <input
                type="text"
                value={newGroupName}
                onChange={(e) =>
                  setNewGroupName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateGroup();
                  }
                }}
                placeholder="e.g. Goa Trip"
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateGroup}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;
