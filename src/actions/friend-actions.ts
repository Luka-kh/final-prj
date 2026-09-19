"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/session"
import type { FriendSearchResult } from "@/types/friend"

type FriendActionResult =
  | {
      success: true
      message?: string
    }
  | {
      success: false
      message: string
    }

type FriendSearchActionResult =
  | {
      success: true
      users: FriendSearchResult[]
    }
  | {
      success: false
      message: string
      users: []
    }

const searchSchema = z
  .string()
  .trim()
  .min(2, "Enter at least two characters.")
  .max(100)

const idSchema = z.string().min(1)

const friendUserSelect = {
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

export async function searchUsers(
  query: string,
): Promise<FriendSearchActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedQuery = searchSchema.safeParse(query)

  if (!parsedQuery.success) {
    return {
      success: false,
      message:
        parsedQuery.error.flatten().formErrors[0] ??
        "Enter at least two characters.",
      users: [],
    }
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentUser.id,
      },
      OR: [
        {
          username: {
            contains: parsedQuery.data,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: parsedQuery.data,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: parsedQuery.data,
            mode: "insensitive",
          },
        },
      ],
    },
    select: friendUserSelect,
    orderBy: {
      name: "asc",
    },
    take: 10,
  })

  if (users.length === 0) {
    return {
      success: true,
      users: [],
    }
  }

  const userIds = users.map((user) => user.id)

  const [friendships, pendingRequests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [
          {
            firstUserId: currentUser.id,
            secondUserId: {
              in: userIds,
            },
          },
          {
            secondUserId: currentUser.id,
            firstUserId: {
              in: userIds,
            },
          },
        ],
      },
      select: {
        firstUserId: true,
        secondUserId: true,
      },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        OR: [
          {
            senderId: currentUser.id,
            receiverId: {
              in: userIds,
            },
          },
          {
            receiverId: currentUser.id,
            senderId: {
              in: userIds,
            },
          },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    }),
  ])

  const friendIds = new Set(
    friendships.map((friendship) =>
      friendship.firstUserId === currentUser.id
        ? friendship.secondUserId
        : friendship.firstUserId,
    ),
  )

  const sentRequestIds = new Set(
    pendingRequests
      .filter((request) => request.senderId === currentUser.id)
      .map((request) => request.receiverId),
  )

  const receivedRequestIds = new Set(
    pendingRequests
      .filter((request) => request.receiverId === currentUser.id)
      .map((request) => request.senderId),
  )

  return {
    success: true,
    users: users.map((user) => {
      let relationship: FriendSearchResult["relationship"] = "NONE"

      if (friendIds.has(user.id)) {
        relationship = "FRIEND"
      } else if (sentRequestIds.has(user.id)) {
        relationship = "REQUEST_SENT"
      } else if (receivedRequestIds.has(user.id)) {
        relationship = "REQUEST_RECEIVED"
      }

      return {
        ...user,
        relationship,
      }
    }),
  }
}

export async function sendFriendRequest(
  receiverId: string,
): Promise<FriendActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedReceiverId = idSchema.safeParse(receiverId)

  if (!parsedReceiverId.success) {
    return {
      success: false,
      message: "The selected user is invalid.",
    }
  }

  if (parsedReceiverId.data === currentUser.id) {
    return {
      success: false,
      message: "You cannot send a friend request to yourself.",
    }
  }

  const receiver = await prisma.user.findUnique({
    where: {
      id: parsedReceiverId.data,
    },
    select: {
      id: true,
    },
  })

  if (!receiver) {
    return {
      success: false,
      message: "This user could not be found.",
    }
  }

  const normalizedIds = normalizeFriendIds(
    currentUser.id,
    receiver.id,
  )

  const friendship = await prisma.friendship.findUnique({
    where: {
      firstUserId_secondUserId: normalizedIds,
    },
    select: {
      id: true,
    },
  })

  if (friendship) {
    return {
      success: false,
      message: "You are already friends with this user.",
    }
  }

  const incomingRequest = await prisma.friendRequest.findUnique({
    where: {
      senderId_receiverId: {
        senderId: receiver.id,
        receiverId: currentUser.id,
      },
    },
    select: {
      status: true,
    },
  })

  if (incomingRequest?.status === "PENDING") {
    return {
      success: false,
      message:
        "This user has already sent you a request. Accept it from your received requests.",
    }
  }

  const existingRequest = await prisma.friendRequest.findUnique({
    where: {
      senderId_receiverId: {
        senderId: currentUser.id,
        receiverId: receiver.id,
      },
    },
    select: {
      id: true,
      status: true,
    },
  })

  if (existingRequest?.status === "PENDING") {
    return {
      success: false,
      message: "You have already sent this user a friend request.",
    }
  }

  if (existingRequest) {
    await prisma.friendRequest.update({
      where: {
        id: existingRequest.id,
      },
      data: {
        status: "PENDING",
      },
    })
  } else {
    await prisma.friendRequest.create({
      data: {
        senderId: currentUser.id,
        receiverId: receiver.id,
      },
    })
  }

  revalidatePath("/boards")

  return {
    success: true,
    message: "Friend request sent.",
  }
}

export async function acceptFriendRequest(
  requestId: string,
): Promise<FriendActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedRequestId = idSchema.safeParse(requestId)

  if (!parsedRequestId.success) {
    return {
      success: false,
      message: "The selected request is invalid.",
    }
  }

  const request = await prisma.friendRequest.findFirst({
    where: {
      id: parsedRequestId.data,
      receiverId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
    },
  })

  if (!request) {
    return {
      success: false,
      message: "This friend request is no longer available.",
    }
  }

  const normalizedIds = normalizeFriendIds(
    request.senderId,
    request.receiverId,
  )

  await prisma.$transaction([
    prisma.friendship.upsert({
      where: {
        firstUserId_secondUserId: normalizedIds,
      },
      update: {},
      create: normalizedIds,
    }),
    prisma.friendRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: "ACCEPTED",
      },
    }),
    prisma.friendRequest.updateMany({
      where: {
        senderId: request.receiverId,
        receiverId: request.senderId,
        status: "PENDING",
      },
      data: {
        status: "ACCEPTED",
      },
    }),
  ])

  revalidatePath("/boards")

  return {
    success: true,
    message: "Friend request accepted.",
  }
}

export async function rejectFriendRequest(
  requestId: string,
): Promise<FriendActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedRequestId = idSchema.safeParse(requestId)

  if (!parsedRequestId.success) {
    return {
      success: false,
      message: "The selected request is invalid.",
    }
  }

  const request = await prisma.friendRequest.findFirst({
    where: {
      id: parsedRequestId.data,
      receiverId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  })

  if (!request) {
    return {
      success: false,
      message: "This friend request is no longer available.",
    }
  }

  await prisma.friendRequest.update({
    where: {
      id: request.id,
    },
    data: {
      status: "REJECTED",
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Friend request rejected.",
  }
}

export async function cancelFriendRequest(
  requestId: string,
): Promise<FriendActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedRequestId = idSchema.safeParse(requestId)

  if (!parsedRequestId.success) {
    return {
      success: false,
      message: "The selected request is invalid.",
    }
  }

  const request = await prisma.friendRequest.findFirst({
    where: {
      id: parsedRequestId.data,
      senderId: currentUser.id,
      status: "PENDING",
    },
    select: {
      id: true,
    },
  })

  if (!request) {
    return {
      success: false,
      message: "This friend request is no longer available.",
    }
  }

  await prisma.friendRequest.delete({
    where: {
      id: request.id,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Friend request canceled.",
  }
}

export async function removeFriend(
  friendId: string,
): Promise<FriendActionResult> {
  const currentUser = await requireCurrentUser()
  const parsedFriendId = idSchema.safeParse(friendId)

  if (!parsedFriendId.success) {
    return {
      success: false,
      message: "The selected friend is invalid.",
    }
  }

  const normalizedIds = normalizeFriendIds(
    currentUser.id,
    parsedFriendId.data,
  )

  const friendship = await prisma.friendship.findUnique({
    where: {
      firstUserId_secondUserId: normalizedIds,
    },
    select: {
      id: true,
    },
  })

  if (!friendship) {
    return {
      success: false,
      message: "This friendship could not be found.",
    }
  }

  await prisma.friendship.delete({
    where: {
      id: friendship.id,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    message: "Friend removed.",
  }
}