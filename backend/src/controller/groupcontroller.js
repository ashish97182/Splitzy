import prisma from "../config/db.js";
import {calculateBalances} from "../../services/balanceService.js";
import { sendGroupInviteEmail } from "../../services/mail/email.service.js";
// ----------------------------------------------------
// POST /api/groups
// ----------------------------------------------------
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: "Group name is required." });
    }
    const newGroup = await prisma.$transaction(
      async (tx) => {
        const group = await tx.groups.create({
          data: {
            name,
            description: description || "",
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.group_members.create({
          data: {
            userId: userId,
            groupId: group.id,
            role: "ADMIN",
            joinedAt: new Date(),
          },
        });

        return group;
      },
      {
        maxWait: 5000, // Wait up to 5 seconds for a connection
        timeout: 10000, // Allow up to 10 seconds for the transaction to finish
      },
    );

    return res.status(201).json({
      message: "Group created successfully!",
      group: newGroup,
    });
  } catch (error) {
    console.error("Error in createGroup:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// GET /api/groups
// ----------------------------------------------------
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const groups = await prisma.groups.findMany({
      where: {
        group_members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        group_members: {
          where: {
            userId: userId,
          },
          select: {
            role: true,
            joinedAt: true,
          },
        },
      },
    });

    return res.status(200).json({ groups });
  } catch (error) {
    console.error("Error in getUserGroups:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


// ----------------------------------------------------
// GET /api/groups/:groupId
// ----------------------------------------------------
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: {
        id: groupId,
        group_members: {
          some: {
            userId: userId, 
          },
        },
      },
      include: {
        group_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not a member." });
    }

    return res.status(200).json({ group });
  } catch (error) {
    console.error("Error in getGroupById:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// POST /api/groups/:groupId/members
// ----------------------------------------------------
export const addGroupMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    const requesterId = req.user.userId;

    if (!email) {
      return res
        .status(400)
        .json({ error: "Email is required to add a member." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const group = await prisma.groups.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }
    const isRequesterMember = await prisma.group_members.findFirst({
      where: { groupId: groupId, userId: requesterId },
    });

    if (!isRequesterMember) {
      return res
        .status(403)
        .json({ error: "You must be a member of the group to add others." });
    }
    const userToAdd = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!userToAdd) {
      return res
        .status(404)
        .json({ error: "User with this email not found in Splitzy." });
    }
    const existingMember = await prisma.group_members.findFirst({
      where: { groupId: groupId, userId: userToAdd.id },
    });

    if (existingMember) {
      return res
        .status(400)
        .json({ error: "User is already a member of this group." });
    }
    const newMember = await prisma.group_members.create({
      data: {
        groupId: groupId,
        userId: userToAdd.id,
        role: "MEMBER",
        joinedAt: new Date(),
      },
    });

    // 6. 🌟 Non-blocking background email dispatch
    // We grab the requester's name directly from the JWT (req.user.name) if available,
    // or fallback to "A group member"
    sendGroupInviteEmail(
      userToAdd.email,
      userToAdd.name,
      group.name,
      req.user.name || "A group member",
    ).catch((emailErr) => {
      console.error(
        `Failed to send group invite email to ${userToAdd.email}:`,
        emailErr.message,
      );
    });

    return res.status(201).json({
      message: "Member added successfully!",
      member: newMember,
    });
  } catch (error) {
    console.error("Error in addGroupMember:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


// ----------------------------------------------------------
// REMOVE MEMBER: DELETE /api/groups/:groupId/members/:userId
// ----------------------------------------------------------
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const requesterId = req.user.userId;

    const requesterMembership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only group admins can remove members." });
    }

    if (userId === requesterId) {
      return res.status(400).json({ error: "You cannot remove yourself." });
    }

    const targetMembership = await prisma.group_members.findFirst({
      where: { groupId, userId },
    });

    if (!targetMembership) {
      return res
        .status(404)
        .json({ error: "User is not a member of this group." });
    }

    const balances = await calculateBalances(groupId);

    const userBalance = balances.summary.find((b) => b.userId === userId);
    if (userBalance && userBalance.netBalance !== 0) {
      const action = userBalance.netBalance > 0 ? "is owed" : "owes";
      const amount = Math.abs(userBalance.netBalance);

      return res.status(400).json({
        error: `Cannot remove member. They still ${action} $${amount} in this group. Please settle all debts first.`,
      });
    }
    await prisma.group_members.delete({
      where: { id: targetMembership.id },
    });

    return res
      .status(200)
      .json({ message: "Member removed from the group successfully." });
  } catch (error) {
    console.error("Error removing member:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// EDIT GROUP: PUT /api/groups/:groupId
// ----------------------------------------------------
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const requesterId = req.user.userId;

    // 1. Verify the requester is an ADMIN
    const requesterMembership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only group admins can edit group details." });
    }

    // 2. Update the group in the database
    // (Assuming your table is called `groups`. Change to `group` if your schema uses singular)
    const updatedGroup = await prisma.groups.update({
      where: { id: groupId },
      data: { name, description }, 
    });

    return res.status(200).json({ 
      message: "Group updated successfully.", 
      group: updatedGroup 
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// DELETE GROUP: DELETE /api/groups/:groupId
// ----------------------------------------------------
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = req.user.userId;

    // 1. Verify the requester is an ADMIN
    const requesterMembership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only group admins can delete the group." });
    }

    // 2. Fetch all expenses in this group so we can delete their splits
    const groupExpenses = await prisma.expenses.findMany({
      where: { groupId },
    });
    const expenseIds = groupExpenses.map((expense) => expense.id);

    // 3. Use a safe $transaction to manually cascade the deletion
    // We must delete from the "bottom up" (Splits -> Expenses -> Members -> Group)
    await prisma.$transaction([
      prisma.expense_splits.deleteMany({ where: { expenseId: { in: expenseIds } } }),
      prisma.expenses.deleteMany({ where: { groupId } }),
      prisma.group_members.deleteMany({ where: { groupId } }),
      prisma.groups.delete({ where: { id: groupId } }),
    ]);

    return res.status(200).json({ 
      message: "Group and all related expenses have been permanently deleted." 
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
