import prisma from "../config/db.js";

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
      return res.status(400).json({ error: "Email is required to add a member." });
    }

    const isRequesterMember = await prisma.group_members.findFirst({
      where: { groupId: groupId, userId: requesterId },
    });

    if (!isRequesterMember) {
      return res.status(403).json({ error: "You must be a member of the group to add others." });
    }


    const userToAdd = await prisma.users.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return res.status(404).json({ error: "User with this email not found in Splitzy." });
    }

    const existingMember = await prisma.group_members.findFirst({
      where: { groupId: groupId, userId: userToAdd.id },
    });

    if (existingMember) {
      return res.status(400).json({ error: "User is already a member of this group." });
    }

    const newMember = await prisma.group_members.create({
      data: {
        groupId: groupId,
        userId: userToAdd.id,
        role: "MEMBER",
        joinedAt: new Date(),
      },
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