import calculateSplits from "../services/splitService.js";

function test(name, testFunction) {
  try {
    testFunction();
    console.log(`❌ ${name} — should have failed`);
  } catch (error) {
    console.log(`✅ ${name} — ${error.message}`);
  }
}


// 1. EXACT amounts don't add up
test("EXACT total mismatch", () => {
  calculateSplits({
    amount: 1000,
    splitType: "EXACT",
    participants: ["Rahul", "Priya", "Aman"],
    values: [200, 300, 400]
  });
});


// 2. Negative EXACT amount
test("EXACT negative amount", () => {
  calculateSplits({
    amount: 1000,
    splitType: "EXACT",
    participants: ["Rahul", "Priya", "Aman"],
    values: [200, -100, 900]
  });
});


// 3. PERCENTAGE doesn't add to 100
test("PERCENTAGE total mismatch", () => {
  calculateSplits({
    amount: 1000,
    splitType: "PERCENTAGE",
    participants: ["Rahul", "Priya", "Aman"],
    values: [50, 30, 30]
  });
});


// 4. Negative percentage
test("PERCENTAGE negative value", () => {
  calculateSplits({
    amount: 1000,
    splitType: "PERCENTAGE",
    participants: ["Rahul", "Priya", "Aman"],
    values: [120, -10, -10]
  });
});


// 5. Invalid split type
test("Invalid split type", () => {
  calculateSplits({
    amount: 1000,
    splitType: "MAGIC",
    participants: ["Rahul", "Priya", "Aman"]
  });
});


// 6. No participants
test("No participants", () => {
  calculateSplits({
    amount: 1000,
    splitType: "EQUAL",
    participants: []
  });
});


// 7. Invalid expense amount
test("Invalid expense amount", () => {
  calculateSplits({
    amount: 0,
    splitType: "EQUAL",
    participants: ["Rahul", "Priya"]
  });
});