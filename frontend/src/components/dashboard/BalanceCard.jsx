function BalanceCard({ balance }) {
  const isPositive = balance > 0;
  const isNegative = balance < 0;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">
        Your Balance
      </h2>

      <p
        className={`mt-3 text-3xl font-bold ${
          isPositive
            ? "text-green-600"
            : isNegative
            ? "text-red-600"
            : "text-gray-600"
        }`}
      >
        {balance >= 0 ? "+" : "-"}₹{Math.abs(balance).toFixed(2)}
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {isPositive
          ? "You are owed money"
          : isNegative
          ? "You owe money"
          : "You are settled up"}
      </p>
    </div>
  );
}

export default BalanceCard;