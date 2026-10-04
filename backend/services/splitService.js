function roundToPaise(amount) {
  return Math.round(amount * 100);
}

function calculateSplits({ amount, splitType, participants, values = [] }) {
  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a valid number greater than 0");
  }

  if (!participants || participants.length === 0) {
    throw new Error("At least one participant is required");
  }

  if (new Set(participants).size !== participants.length) {
    throw new Error("Participants cannot contain duplicate users");
  }

  const totalPaise = roundToPaise(amount);

  // 1. EQUAL
  if (splitType === "EQUAL") {
    const baseShare = Math.floor(totalPaise / participants.length);
    const remainder = totalPaise % participants.length;

    return participants.map((userId, index) => ({
      userId,
      amount: (baseShare + (index < remainder ? 1 : 0)) / 100,
    }));
  }

  // 2. EXACT
  if (splitType === "EXACT") {
    if (values.length !== participants.length) {
      throw new Error(
        "Number of exact amounts must match number of participants",
      );
    }

    const amounts = values.map(Number);
    if (amounts.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(
        "Exact split amounts must be valid, non-negative numbers",
      );
    }

    const splitTotalPaise = amounts.reduce(
      (sum, value) => sum + roundToPaise(value),
      0,
    );
    if (splitTotalPaise !== totalPaise) {
      throw new Error("Exact split amounts must add up to the total expense");
    }

    return participants.map((userId, index) => ({
      userId,
      amount: roundToPaise(amounts[index]) / 100,
    }));
  }

  // 3. PERCENTAGE
  if (splitType === "PERCENTAGE") {
    if (values.length !== participants.length) {
      throw new Error(
        "Number of percentages must match number of participants",
      );
    }

    const percentages = values.map(Number);
    if (percentages.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Percentage values must be valid, non-negative numbers");
    }

    const totalPercentage = percentages.reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalPercentage - 100) > 0.000001) {
      throw new Error("Percentages must add up to 100");
    }

    const shares = percentages.map((percentage) =>
      Math.round((totalPaise * percentage) / 100),
    );
    const calculatedTotal = shares.reduce((sum, share) => sum + share, 0);
    const difference = totalPaise - calculatedTotal;

    if (difference !== 0) {
      shares[shares.length - 1] += difference; // Give leftover penny to the last person
    }

    return participants.map((userId, index) => ({
      userId,
      amount: shares[index] / 100,
    }));
  }

  // 4. SHARES (NEW)
  if (splitType === "SHARES") {
    if (values.length !== participants.length) {
      throw new Error("Number of shares must match number of participants");
    }

    const sharesArray = values.map(Number);
    if (sharesArray.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Share values must be valid, non-negative numbers");
    }

    const totalShares = sharesArray.reduce((sum, value) => sum + value, 0);
    if (totalShares === 0) {
      throw new Error("Total shares must be greater than 0");
    }

    // Calculate how much money each person owes based on their shares
    const calculatedAmounts = sharesArray.map((share) =>
      Math.round((totalPaise * share) / totalShares),
    );

    // Handle any 1-penny rounding errors
    const calculatedTotal = calculatedAmounts.reduce(
      (sum, val) => sum + val,
      0,
    );
    const difference = totalPaise - calculatedTotal;

    if (difference !== 0) {
      calculatedAmounts[calculatedAmounts.length - 1] += difference;
    }

    return participants.map((userId, index) => ({
      userId,
      amount: calculatedAmounts[index] / 100,
    }));
  }

  throw new Error("Invalid split type");
}

export default calculateSplits;
