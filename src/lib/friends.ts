import { prisma } from "@/lib/prisma"
import type { FriendsOverview } from "@/types/friend"

const friendUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  image: true,
} as const

export async function getFriendsOverview(
  userId: string,
): Promise<FriendsOverview> {
  const [friendships, receivedRequests, sentRequests] =
    await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [
            {
              firstUserId: userId,
            },
            {
              secondUserId: userId,
            },
          ],
        },
        include: {
          firstUser: {
            select: friendUserSelect,
          },
          secondUser: {
            select: friendUserSelect,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        select: {
          id: true,
          sender: {
            select: friendUserSelect,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.friendRequest.findMany({
        where: {
          senderId: userId,
          status: "PENDING",
        },
        select: {
          id: true,
          receiver: {
            select: friendUserSelect,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ])

  const friends = friendships
    .map((friendship) =>
      friendship.firstUserId === userId
        ? friendship.secondUser
        : friendship.firstUser,
    )
    .sort((first, second) => first.name.localeCompare(second.name))

  return {
    friends,
    receivedRequests: receivedRequests.map((request) => ({
      id: request.id,
      user: request.sender,
    })),
    sentRequests: sentRequests.map((request) => ({
      id: request.id,
      user: request.receiver,
    })),
  }
}