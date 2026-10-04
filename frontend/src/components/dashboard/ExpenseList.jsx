function ExpenseList({ expenses, onEditExpense, onRemoveExpense }) {
  return (
    <div className="space-y-4">
      {expenses.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          No expenses added yet.
        </p>
      ) : (
        expenses.map((expense) => {
          const eachAmount =
            expense.amount / expense.splitBetween.length;

          return (
            <div
              key={expense.id}
              className="flex flex-col items-start justify-between gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <div>
                <h3 className="font-semibold text-gray-800">
                  {expense.name}
                </h3>

                <p className="text-sm text-gray-500">
                  Paid by {expense.paidBy}
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  ₹{eachAmount.toLocaleString("en-IN")} each
                </p>
              </div>

              <div className="flex w-full flex-row items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                <p className="text-lg font-bold text-gray-800">
                  ₹{expense.amount.toLocaleString("en-IN")}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => onEditExpense(expense)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    aria-label={`Edit ${expense.name} expense`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveExpense(expense)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                    aria-label={`Remove ${expense.name} expense`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ExpenseList;
