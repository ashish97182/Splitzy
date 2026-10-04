function MemberList({ members, onAddMember, onRemoveMember }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Members
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            People in this group
          </p>
        </div>

        <button
          onClick={onAddMember}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <p className="py-6 text-center text-gray-500">
          No members added yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {members.map((member) => (
            <div
              key={member}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                {member.charAt(0).toUpperCase()}
              </div>

              <span className="font-medium text-gray-700">
                {member}
              </span>

              <button
                onClick={() => onRemoveMember(member)}
                className="ml-2 text-sm font-medium text-red-500 hover:text-red-700"
                title={`Remove ${member}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MemberList;
