import prisma from "../config/db.js";
import { calculateBalances } from "../../services/balanceService.js";
import simplifyDebts from "../../services/debtService.js";

// ----------------------------------------------------
// GET /api/groups/:groupId/balances
// ----------------------------------------------------
export const getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = req.user.userId;
    const isMember = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }
    const { summary } = await calculateBalances(groupId);
    if (summary.length === 0) {
      return res.status(200).json({ summary: [], transactions: [] });
    }

    // 3. Reconstruct the raw balances object for your debt service
    // simplifyDebts expects { "userId": 2000, "userId2": -2000 }
    const rawBalances = {};
    summary.forEach((user) => {
      rawBalances[user.userId] = user.netBalance;
    });
    const transactions = simplifyDebts(rawBalances);
    const groupMembers = await prisma.group_members.findMany({
      where: { groupId: groupId },
      include: { users: { select: { id: true, name: true } } },
    });

    const userNames = {};
    groupMembers.forEach((member) => {
      userNames[member.users.id] = member.users.name;
    });
    const enrichedTransactions = transactions.map((tx) => ({
      from: tx.from,
      fromName: userNames[tx.from] || "Unknown User",
      to: tx.to,
      toName: userNames[tx.to] || "Unknown User",
      amount: tx.amount,
    }));

    const enrichedBalances = summary.map((user) => ({
      userId: user.userId,
      name: userNames[user.userId] || "Unknown User",
      netBalance: user.netBalance,
    }));

    return res.status(200).json({
      summary: enrichedBalances,
      transactions: enrichedTransactions,
    });
  } catch (error) {
    console.error("Error in getGroupBalances:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
