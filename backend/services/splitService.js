function roundToPaise(amount) {
    return Math.round(amount * 100);
  }
function calculateSplits({
    amount,
    splitType,
    participants,
    values = []
  }) {
    // Basic validation
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
  
    if (!participants || participants.length === 0) {
      throw new Error("At least one participant is required");
    }
  
    // =========================
    // EQUAL SPLIT
    // =========================
    if (splitType === "EQUAL") {
        const totalPaise = Math.round(amount * 100);
      
        const baseShare = Math.floor(totalPaise / participants.length);
      
        const remainder = totalPaise % participants.length;
      
        return participants.map((userId, index) => {
          const sharePaise = baseShare + (index < remainder ? 1 : 0);
      
          return {
            userId,
            amount: sharePaise / 100
          };
        });
      }
  
    // =========================
    // EXACT SPLIT
    // =========================
    if (splitType === "EXACT") {
        if (values.length !== participants.length) {
          throw new Error(
            "Number of exact amounts must match number of participants"
          );
        }
      
        const amounts = values.map(Number);
      
        // Check for invalid numbers
        if (amounts.some(value => !Number.isFinite(value))) {
          throw new Error(
            "Exact split amounts must be valid numbers"
          );
        }
      
        // Check for negative amounts
        if (amounts.some(value => value < 0)) {
          throw new Error(
            "Exact split amounts cannot be negative"
          );
        }
      
        // Convert to paise
        const totalPaise = Math.round(amount * 100);
      
        const splitTotalPaise = amounts.reduce(
          (sum, value) => sum + Math.round(value * 100),
          0
        );
      
        // Check that split amounts equal expense
        if (splitTotalPaise !== totalPaise) {
          throw new Error(
            "Exact split amounts must add up to the total expense"
          );
        }
      
        return participants.map((userId, index) => ({
          userId,
          amount: Math.round(amounts[index] * 100) / 100
        }));
      }
    // =========================
    // PERCENTAGE SPLIT
    // =========================
    if (splitType === "PERCENTAGE") {
        if (values.length !== participants.length) {
          throw new Error(
            "Number of percentages must match number of participants"
          );
        }
      
        const percentages = values.map(Number);
      
        // Check for negative percentages
        if (percentages.some(value => value < 0)) {
          throw new Error(
            "Percentage values cannot be negative"
          );
        }
      
        // Check that percentages add up to 100
        const totalPercentage = percentages.reduce(
          (sum, value) => sum + value,
          0
        );
      
        if (Math.abs(totalPercentage - 100) > 0.000001) {
          throw new Error(
            "Percentages must add up to 100"
          );
        }
      
        const totalPaise = Math.round(amount * 100);
      
        // Calculate each share in paise
        const shares = percentages.map((percentage) => {
          return Math.round(
            (totalPaise * percentage) / 100
          );
        });
      
        // Correct any rounding difference
        const calculatedTotal = shares.reduce(
          (sum, share) => sum + share,
          0
        );
      
        const difference = totalPaise - calculatedTotal;
      
        if (difference !== 0) {
          shares[shares.length - 1] += difference;
        }
      
        return participants.map((userId, index) => ({
          userId,
          amount: shares[index] / 100
        }));
      }
    // =========================
    // INVALID SPLIT TYPE
    // =========================
    throw new Error("Invalid split type");
  }
  
  export default calculateSplits;