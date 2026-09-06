import calculateSplits from "../services/splitService.js";
// =========================
// TEST 1: EQUAL
// =========================

const equalResult = calculateSplits({
  amount: 100,
  splitType: "EQUAL",
  participants: ["Rahul", "Priya", "Aman"]
});

console.log("\nEQUAL SPLIT:");
console.log(equalResult);


// =========================
// TEST 2: EXACT
// =========================

// const exactResult = calculateSplits({
//   amount: 1000,
//   splitType: "EXACT",
//   participants: ["Rahul", "Priya", "Aman"],
//   values: [200, 300, 500]
// });

// console.log("\nEXACT SPLIT:");
// console.log(exactResult);


// // =========================
// // TEST 3: PERCENTAGE
// // =========================

// const percentageResult = calculateSplits({
//   amount: 1000,
//   splitType: "PERCENTAGE",
//   participants: ["Rahul", "Priya", "Aman"],
//   values: [50, 30, 20]
// });

// console.log("\nPERCENTAGE SPLIT:");
// console.log(percentageResult);