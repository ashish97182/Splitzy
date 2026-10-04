function SettlementList({ settlements, onMarkPaid }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Settlements
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Track who owes whom money.
        </p>
      </div>

      {settlements.length === 0 ? (
        <div className="rounded-lg bg-green-50 p-5 text-center">
          <p className="font-medium text-green-700">
            Everyone is settled up 🎉
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlements.map((settlement) => (
            <div
              key={settlement.id}
              className="flex flex-col items-start gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-800">
                  {settlement.from} owes {settlement.to}
                </p>

                <p className="mt-1 text-lg font-bold text-red-600">
                  ₹{settlement.amount.toLocaleString("en-IN")}
                </p>
              </div>

              <button
                onClick={() => onMarkPaid(settlement.id)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Mark as Paid
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SettlementList;
