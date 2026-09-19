import { prisma } from "@/lib/prisma"

export async function getBoardsForUser(userId: string) {
  return prisma.board.findMany({
    where: {
      OR: [
        {
          ownerId: userId,
        },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      columns: {
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          name: true,
          color: true,
          position: true,
          tasks: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              title: true,
              description: true,
              position: true,
              subtasks: {
                orderBy: {
                  position: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  isCompleted: true,
                  position: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })
}