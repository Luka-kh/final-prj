"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/session"
import type {
  BoardInvitationsOverview,
  BoardSharingOverview,
} from "@/types/collaboration"

type CollaborationActionResult =
  | {
      success: true
      message?: string
    }
  | {
      success: false
      message: string
    }

type BoardSharingResult =
  | {
      success: true
      overview: BoardSharingOverview
    }
  | {
      success: false
      message: string
    }

type BoardInvitationsResult =
  | {
      success: true
      overview: BoardInvitationsOverview
    }
  | {
      success: false
      message: string
    }

const idSchema = z.string().min(1)

const collaboratorUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  image: true,
} as const

function normalizeFriendIds(firstId: string, secondId: string) {
  return firstId < secondId
    ? {
        firstUserId: firstId,
        secondUserId: secondId,
      }
    : {
        firstUserId: secondId,
        secondUserId: firstId,
      }
}

export async function loadBoardSharing(
  boardId: string,
): Promise<BoardSharingResult> {
  const currentUser = await requireCurrentUser()
  const parsedBoardId = idSchema.safeParse(boardId)

  if (!parsedBoardId.success) {
    return {
      success: false,
      message: "The selected board is invalid.",
    }
  }

  const [board, friendships] = await Promise.all([
    prisma.board.findFirst({
      where: {
        id: parsedBoardId.data,
        ownerId: currentUser.id,
      },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            role: "MEMBER",
          },
          select: {
            user: {
              select: collaboratorUserSelect,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        invitations: {
          where: {
            status: "PENDING",
          },
          select: {
            id: true,
            receiverId: true,
          },
        },
      },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [
          {
            firstUserId: currentUser.id,
          },
          {
            secondUserId: currentUser.id,
          },
        ],
      },
      select: {
        firstUserId: true,
        secondUserId: true,
        firstUser: {
          select: collaboratorUserSelect,
        },
        secondUser: {
          select: collaboratorUserSelect,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ])

  if (!board) {
    return {
      success: false,
      message: "Only the board owner can manage collaborators.",
    }
  }

  const members = board.members.map((member) => member.user)
  const memberIds = new Set(members.map((member) => member.id))
  const pendingInvitationByUserId = new Map(
    board.invitations.map((invitation) => [
      invitation.receiverId,
      invitation.id,
    ]),
  )

  const friends = friendships
    .map((friendship) =>
      friendship.firstUserId === currentUser.id
        ? friendship.secondUser
        : friendship.firstUser,
    )
    .sort((first, second) => first.name.localeCompare(second.name))
    .map((friend) => {
      const invitationId =
        pendingInvitationByUserId.get(friend.id) ?? null

      return {
        ...friend,
        status: memberIds.has(friend.id)
          ? ("MEMBER" as const)
          : invitationId
            ? ("INVITED" as const)
            : ("AVAILABLE" as const),
        invitationId,
      }
    })

  return {
    success: true,
    overview: {
      boardId: board.id,
      boardName: board.name,
      members,
      friends,
    },
  }
}

export async function loadBoardInvitations(): Promise<BoardInvitationsResult> {
  const currentUser = await requireCurrentUser()

  const invitations = await prisma.boardInvitation.findMany({
    where: {
      receiverId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
      board: {
        select: {
          id: true,
          name: true,
        },
      },
      sender: {
        select: collaboratorUserSelect,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return {
    success: true,
    overview: {
      invitations,
    },
  }
}

export async function inviteFriendToBoard(
  boardId: string,
  friendId: string,
): Promise<CollaborationActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedBoardId = idSchema.safeParse(boardId)
  const parsedFriendId = idSchema.safeParse(friendId)

  if (!parsedBoardId.success || !parsedFriendId.success) {
    return {
      success: false,
      message: "The selected board or friend is invalid.",
    }
  }

  if (parsedFriendId.data === currentUser.id) {
    return {
      success: false,
      message: "You cannot invite yourself to your own board.",
    }
  }

  const board = await prisma.board.findFirst({
    where: {
      id: parsedBoardId.data,
      ownerId: currentUser.id,
    },
    select: {
      id: true,
    },
  })

  if (!board) {
    return {
      success: false,
      message: "Only the board owner can invite collaborators.",
    }
  }

  const normalizedFriendIds = normalizeFriendIds(
    currentUser.id,
    parsedFriendId.data,
  )

  const friendship = await prisma.friendship.findUnique({
    where: {
      firstUserId_secondUserId: normalizedFriendIds,
    },
    select: {
      id: true,
    },
  })

  if (!friendship) {
    return {
      success: false,
      message: "You can only invite users who are your friends.",
    }
  }

  const existingMember = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId: board.id,
        userId: parsedFriendId.data,
      },
    },
    select: {
      id: true,
    },
  })

  if (existingMember) {
    return {
      success: false,
      message: "This friend is already a member of the board.",
    }
  }

  const existingInvitation = await prisma.boardInvitation.findUnique({
    where: {
      boardId_receiverId: {
        boardId: board.id,
        receiverId: parsedFriendId.data,
      },
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (existingInvitation?.status === "PENDING") {
    return {
      success: false,
      message: "This friend already has a pending invitation.",
    }
  }

  if (existingInvitation) {
    await prisma.boardInvitation.update({
      where: {
        id: existingInvitation.id,
      },
      data: {
        senderId: currentUser.id,
        status: "PENDING",
      },
    })
  } else {
    await prisma.boardInvitation.create({
      data: {
        boardId: board.id,
        senderId: currentUser.id,
        receiverId: parsedFriendId.data,
      },
    })
  }

  revalidatePath("/boards")

  return {
    success: true,
    message: "Board invitation sent.",
  }
}

export async function cancelBoardInvitation(
  invitationId: string,
): Promise<CollaborationActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedInvitationId = idSchema.safeParse(invitationId)

  if (!parsedInvitationId.success) {
    return {
      success: false,
      message: "The selected invitation is invalid.",
    }
  }

  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      id: parsedInvitationId.data,
      status: "PENDING",
      board: {
        ownerId: currentUser.id,
      },
    },
    select: {
      id: true,
    },
  })

  if (!invitation) {
    return {
      success: false,
      message: "This invitation is no longer available.",
    }
  }

  await prisma.boardInvitation.delete({
    where: {
      id: invitation.id,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Board invitation canceled.",
  }
}

export async function acceptBoardInvitation(
  invitationId: string,
): Promise<CollaborationActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedInvitationId = idSchema.safeParse(invitationId)

  if (!parsedInvitationId.success) {
    return {
      success: false,
      message: "The selected invitation is invalid.",
    }
  }

  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      id: parsedInvitationId.data,
      receiverId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
      boardId: true,
      receiverId: true,
    },
  })

  if (!invitation) {
    return {
      success: false,
      message: "This board invitation is no longer available.",
    }
  }

  await prisma.$transaction([
    prisma.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId: invitation.receiverId,
        },
      },
      update: {
        role: "MEMBER",
      },
      create: {
        boardId: invitation.boardId,
        userId: invitation.receiverId,
        role: "MEMBER",
      },
    }),
    prisma.boardInvitation.update({
      where: {
        id: invitation.id,
      },
      data: {
        status: "ACCEPTED",
      },
    }),
  ])

  revalidatePath("/boards")

  return {
    success: true,
    message: "Board invitation accepted.",
  }
}

export async function rejectBoardInvitation(
  invitationId: string,
): Promise<CollaborationActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedInvitationId = idSchema.safeParse(invitationId)

  if (!parsedInvitationId.success) {
    return {
      success: false,
      message: "The selected invitation is invalid.",
    }
  }

  const invitation = await prisma.boardInvitation.findFirst({
    where: {
      id: parsedInvitationId.data,
      receiverId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  })

  if (!invitation) {
    return {
      success: false,
      message: "This board invitation is no longer available.",
    }
  }

  await prisma.boardInvitation.update({
    where: {
      id: invitation.id,
    },
    data: {
      status: "REJECTED",
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Board invitation rejected.",
  }
}

export async function removeBoardMember(
  boardId: string,
  memberId: string,
): Promise<CollaborationActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedBoardId = idSchema.safeParse(boardId)
  const parsedMemberId = idSchema.safeParse(memberId)

  if (!parsedBoardId.success || !parsedMemberId.success) {
    return {
      success: false,
      message: "The selected board member is invalid.",
    }
  }

  const board = await prisma.board.findFirst({
    where: {
      id: parsedBoardId.data,
      ownerId: currentUser.id,
    },
    select: {
      id: true,
      ownerId: true,
    },
  })

  if (!board) {
    return {
      success: false,
      message: "Only the board owner can remove collaborators.",
    }
  }

  if (parsedMemberId.data === board.ownerId) {
    return {
      success: false,
      message: "The board owner cannot be removed.",
    }
  }

  const member = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId: board.id,
        userId: parsedMemberId.data,
      },
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!member || member.role !== "MEMBER") {
    return {
      success: false,
      message: "This board member could not be found.",
    }
  }

  await prisma.boardMember.delete({
    where: {
      id: member.id,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Board member removed.",
  }
}