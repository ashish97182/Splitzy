import { fromMinorUnits, toMinorUnits } from "./money.js";

function allocateProportionally(totalMinorUnits, weights) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!(totalWeight > 0) || !Number.isFinite(totalWeight)) {
    throw new Error("Split weights must add up to a positive finite value");
  }

  const exactShares = weights.map((weight) => (totalMinorUnits * weight) / totalWeight);
  const shares = exactShares.map(Math.floor);
  const remaining = totalMinorUnits - shares.reduce((sum, share) => sum + share, 0);

  const byRemainder = exactShares
    .map((share, index) => ({ index, remainder: share - shares[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < remaining; index++) {
    shares[byRemainder[index].index] += 1;
  }
  return shares;
}

function calculateSplits({ amount, splitType, participants, values = [] }) {
  let totalMinorUnits;
  try {
    totalMinorUnits = toMinorUnits(amount);
  } catch {
    throw new Error("Amount must be a valid number with at most two decimal places");
  }
  if (totalMinorUnits <= 0) {
    throw new Error("Amount must be a valid number greater than 0");
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("At least one participant is required");
  }

  if (new Set(participants).size !== participants.length) {
    throw new Error("Participants cannot contain duplicate users");
  }

  if (splitType === "EQUAL") {
    return allocateProportionally(totalMinorUnits, participants.map(() => 1))
      .map((minorUnits, index) => ({
        userId: participants[index],
        amount: fromMinorUnits(minorUnits),
      }));
  }

  if (splitType === "EXACT") {
    if (values.length !== participants.length) {
      throw new Error(
        "Number of exact amounts must match number of participants",
      );
    }

    let amounts;
    try {
      amounts = values.map(toMinorUnits);
    } catch {
      throw new Error("Exact split amounts must have at most two decimal places");
    }
    if (amounts.some((value) => value < 0)) {
      throw new Error(
        "Exact split amounts must be valid, non-negative numbers",
      );
    }

    const splitTotal = amounts.reduce((sum, value) => sum + value, 0);
    if (splitTotal !== totalMinorUnits) {
      throw new Error("Exact split amounts must add up to the total expense");
    }

    return participants.map((userId, index) => ({
      userId,
      amount: fromMinorUnits(amounts[index]),
    }));
  }

  if (splitType === "PERCENTAGE") {
    if (values.length !== participants.length) {
      throw new Error(
        "Number of percentages must match number of participants",
      );
    }

    const percentages = values.map(Number);
    if (percentages.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      throw new Error("Percentage values must be valid, non-negative numbers");
    }

    const totalPercentage = percentages.reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalPercentage - 100) > 0.000001) {
      throw new Error("Percentages must add up to 100");
    }

    const shares = allocateProportionally(totalMinorUnits, percentages);
    return participants.map((userId, index) => ({
      userId,
      amount: fromMinorUnits(shares[index]),
    }));
  }

  if (splitType === "SHARES") {
    if (values.length !== participants.length) {
      throw new Error("Number of shares must match number of participants");
    }

    const sharesArray = values.map(Number);
    if (sharesArray.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Share values must be valid, non-negative numbers");
    }

    if (sharesArray.every((value) => value === 0)) {
      throw new Error("Total shares must be greater than 0");
    }

    const calculatedAmounts = allocateProportionally(totalMinorUnits, sharesArray);
    return participants.map((userId, index) => ({
      userId,
      amount: fromMinorUnits(calculatedAmounts[index]),
    }));
  }

  throw new Error("Invalid split type");
}

export default calculateSplits;
