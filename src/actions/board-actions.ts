"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/session"

const columnSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Column name cannot be empty").max(50),
})

const boardSchema = z.object({
  name: z.string().trim().min(1, "Board name cannot be empty").max(60),
  columns: z.array(columnSchema).max(10, "A board can have up to 10 columns"),
})

type BoardInput = z.infer<typeof boardSchema>

type ActionResult =
  | {
      success: true
      boardId?: string
    }
  | {
      success: false
      message: string
      fieldErrors?: {
        name?: string
        columns?: string
      }
    }

const columnColors = [
  "#49C4E5",
  "#8471F2",
  "#67E2AE",
  "#E4A0F7",
  "#FFB74D",
  "#EA5555",
]

function getBoardErrors(error: z.ZodError<BoardInput>) {
  const flattened = error.flatten()

  return {
    name: flattened.fieldErrors.name?.[0],
    columns: flattened.fieldErrors.columns?.[0],
  }
}

export async function createBoard(input: BoardInput): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const result = boardSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      message: "Check the board information and try again.",
      fieldErrors: getBoardErrors(result.error),
    }
  }

  const board = await prisma.board.create({
    data: {
      name: result.data.name,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
      columns: {
        create: result.data.columns.map((column, index) => ({
          name: column.name,
          position: index,
          color: columnColors[index % columnColors.length],
        })),
      },
    },
    select: {
      id: true,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
    boardId: board.id,
  }
}

export async function updateBoard(
  boardId: string,
  input: BoardInput,
): Promise<ActionResult> {
  const user = await requireCurrentUser()
  const result = boardSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      message: "Check the board information and try again.",
      fieldErrors: getBoardErrors(result.error),
    }
  }

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      ownerId: user.id,
    },
    select: {
      id: true,
      columns: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!board) {
    return {
      success: false,
      message: "You do not have permission to edit this board.",
    }
  }

  const existingIds = new Set(board.columns.map((column) => column.id))
  const submittedIds = new Set(
    result.data.columns
      .map((column) => column.id)
      .filter((id): id is string => Boolean(id)),
  )

  const invalidColumn = [...submittedIds].some((id) => !existingIds.has(id))

  if (invalidColumn) {
    return {
      success: false,
      message: "One or more columns do not belong to this board.",
    }
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.boardColumn.deleteMany({
      where: {
        boardId,
        id: {
          notIn: [...submittedIds],
        },
      },
    })

    await transaction.boardColumn.updateMany({
      where: {
        boardId,
      },
      data: {
        position: {
          increment: 1000,
        },
      },
    })

    for (const [index, column] of result.data.columns.entries()) {
      if (column.id) {
        await transaction.boardColumn.update({
          where: {
            id: column.id,
          },
          data: {
            name: column.name,
            position: index,
            color: columnColors[index % columnColors.length],
          },
        })
      } else {
        await transaction.boardColumn.create({
          data: {
            boardId,
            name: column.name,
            position: index,
            color: columnColors[index % columnColors.length],
          },
        })
      }
    }

    await transaction.board.update({
      where: {
        id: boardId,
      },
      data: {
        name: result.data.name,
      },
    })
  })

  revalidatePath("/boards")

  return {
    success: true,
    boardId,
  }
}

export async function deleteBoard(boardId: string): Promise<ActionResult> {
  const user = await requireCurrentUser()

  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      ownerId: user.id,
    },
    select: {
      id: true,
    },
  })

  if (!board) {
    return {
      success: false,
      message: "You do not have permission to delete this board.",
    }
  }

  await prisma.board.delete({
    where: {
      id: boardId,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
  }
}