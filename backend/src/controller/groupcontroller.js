import prisma from "../config/db.js";
import { calculateBalances } from "../../services/balanceService.js";
import { fromMinorUnits } from "../../services/money.js";
import { lockActiveGroup } from "../../services/groupLock.js";
import { isSerializationConflict } from "../../services/isSerializationConflict.js";
import {
  isEmailConfigured,
  sendGroupInviteEmail,
} from "../../services/mail/email.service.js";
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
        deletedAt: null,
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
        deletedAt: null,
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
    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }
    const requesterMembership = await prisma.group_members.findFirst({
      where: { groupId: groupId, userId: requesterId },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only group admins can add members." });
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
    const memberResult = await prisma.$transaction(async (tx) => {
      if (!await lockActiveGroup(tx, groupId)) {
        return { error: { status: 404, message: "Group not found." } };
      }
      const adminMembership = await tx.group_members.findFirst({
        where: { groupId, userId: requesterId, role: "ADMIN" },
      });
      if (!adminMembership) {
        return { error: { status: 403, message: "Only group admins can add members." } };
      }
      const memberExists = await tx.group_members.findFirst({
        where: { groupId, userId: userToAdd.id },
      });
      if (memberExists) {
        return { error: { status: 400, message: "User is already a member of this group." } };
      }
      const member = await tx.group_members.create({
        data: { groupId, userId: userToAdd.id, role: "MEMBER" },
      });
      return { member };
    }, { isolationLevel: "Serializable" });
    if (memberResult.error) {
      return res.status(memberResult.error.status).json({ error: memberResult.error.message });
    }
    const newMember = memberResult.member;

    // 6. 🌟 Non-blocking background email dispatch
    // We grab the requester's name directly from the JWT (req.user.name) if available,
    // or fallback to "A group member"
    if (isEmailConfigured()) {
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
    }

    return res.status(201).json({
      message: "Member added successfully!",
      member: newMember,
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({ error: "Group changed concurrently. Please retry." });
    }
    console.error("Error in addGroupMember:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};


// ----------------------------------------------------------
// REMOVE MEMBER: DELETE /api/groups/:groupId/members/:userId
// ----------------------------------------------------------

export const removeGroupMember = async (req, res) => {
  const { groupId, userId } = req.params;
  const requesterId = req.user.userId;

  if (userId === requesterId) {
    return res.status(400).json({
      error: "You cannot remove yourself.",
    });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Ensure the group exists and is active.
        if (!(await lockActiveGroup(tx, groupId))) {
          return {
            status: 404,
            body: { error: "Group not found." },
          };
        }

        // Only group admins can remove members.
        const requesterMembership = await tx.group_members.findFirst({
          where: {
            groupId,
            userId: requesterId,
          },
        });

        if (!requesterMembership || requesterMembership.role !== "ADMIN") {
          return {
            status: 403,
            body: {
              error: "Only group admins can remove members.",
            },
          };
        }

        // Find the target membership.
        const targetMembership = await tx.group_members.findFirst({
          where: {
            groupId,
            userId,
          },
        });

        if (!targetMembership) {
          return {
            status: 404,
            body: {
              error: "User is not a member of this group.",
            },
          };
        }

        // Calculate balances within the same transaction.
        const balances = await calculateBalances(groupId, tx);

        const balanceMinorUnits = balances.balancesMinorUnits[userId] ?? 0;

        if (balanceMinorUnits !== 0) {
          const action = balanceMinorUnits > 0 ? "is owed" : "owes";

          const amount = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(fromMinorUnits(Math.abs(balanceMinorUnits)));

          return {
            status: 400,
            body: {
              error: `Cannot remove member. They still ${action} ${amount} in this group. Please settle all debts first.`,
            },
          };
        }

        await tx.group_members.delete({
          where: {
            id: targetMembership.id,
          },
        });

        return {
          status: 200,
          body: {
            message: "Member removed from the group successfully.",
          },
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
        isolationLevel: "Serializable",
      },
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({
        error: "Group ledger changed concurrently. Please retry.",
      });
    }

    console.error("Error removing member:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
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

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

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
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
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

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const requesterMembership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      return res.status(403).json({ error: "Only group admins can delete the group." });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!await lockActiveGroup(tx, groupId)) {
        return { status: 404, error: "Group not found." };
      }
      const adminMembership = await tx.group_members.findFirst({
        where: { groupId, userId: requesterId, role: "ADMIN" },
      });
      if (!adminMembership) {
        return { status: 403, error: "Only group admins can delete the group." };
      }
      await tx.groups.update({
        where: { id: groupId },
        data: { deletedAt: new Date() },
      });
      return { status: 200 };
    }, { isolationLevel: "Serializable" });
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      message: "Group archived successfully. Its ledger history has been preserved."
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({ error: "Group changed concurrently. Please retry." });
    }
    console.error("Error deleting group:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
