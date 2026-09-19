"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/session"

const subtaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Subtask title cannot be empty").max(120),
})

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title cannot be empty").max(120),
  description: z.string().trim().max(1000),
  columnId: z.string().min(1, "Select a status"),
  subtasks: z.array(subtaskSchema).max(20),
})

type TaskInput = z.infer<typeof taskSchema>

type TaskActionResult =
  | {
      success: true
      taskId?: string
    }
  | {
      success: false
      message: string
      fieldErrors?: {
        title?: string
        description?: string
        columnId?: string
        subtasks?: string
      }
    }

function getTaskErrors(error: z.ZodError<TaskInput>) {
  const flattened = error.flatten()

  return {
    title: flattened.fieldErrors.title?.[0],
    description: flattened.fieldErrors.description?.[0],
    columnId: flattened.fieldErrors.columnId?.[0],
    subtasks: flattened.fieldErrors.subtasks?.[0],
  }
}

function boardAccess(userId: string) {
  return {
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
  }
}

export async function createTask(
  input: TaskInput,
): Promise<TaskActionResult> {
  const user = await requireCurrentUser()
  const result = taskSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      message: "Check the task information and try again.",
      fieldErrors: getTaskErrors(result.error),
    }
  }

  const column = await prisma.boardColumn.findFirst({
    where: {
      id: result.data.columnId,
      board: boardAccess(user.id),
    },
    select: {
      id: true,
    },
  })

  if (!column) {
    return {
      success: false,
      message: "You do not have permission to add tasks to this board.",
    }
  }

  const lastTask = await prisma.task.findFirst({
    where: {
      columnId: column.id,
    },
    orderBy: {
      position: "desc",
    },
    select: {
      position: true,
    },
  })

  const task = await prisma.task.create({
    data: {
      title: result.data.title,
      description: result.data.description,
      columnId: column.id,
      creatorId: user.id,
      position: (lastTask?.position ?? -1) + 1,
      subtasks: {
        create: result.data.subtasks.map((subtask, index) => ({
          title: subtask.title,
          position: index,
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
    taskId: task.id,
  }
}

export async function updateTask(
  taskId: string,
  input: TaskInput,
): Promise<TaskActionResult> {
  const user = await requireCurrentUser()
  const result = taskSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      message: "Check the task information and try again.",
      fieldErrors: getTaskErrors(result.error),
    }
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      column: {
        board: boardAccess(user.id),
      },
    },
    select: {
      id: true,
      columnId: true,
      position: true,
      column: {
        select: {
          boardId: true,
        },
      },
      subtasks: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!task) {
    return {
      success: false,
      message: "You do not have permission to edit this task.",
    }
  }

  const targetColumn = await prisma.boardColumn.findFirst({
    where: {
      id: result.data.columnId,
      boardId: task.column.boardId,
    },
    select: {
      id: true,
    },
  })

  if (!targetColumn) {
    return {
      success: false,
      message: "The selected status does not belong to this board.",
    }
  }

  const existingSubtaskIds = new Set(
    task.subtasks.map((subtask) => subtask.id),
  )
  const submittedSubtaskIds = new Set(
    result.data.subtasks
      .map((subtask) => subtask.id)
      .filter((id): id is string => Boolean(id)),
  )

  const containsInvalidSubtask = [...submittedSubtaskIds].some(
    (id) => !existingSubtaskIds.has(id),
  )

  if (containsInvalidSubtask) {
    return {
      success: false,
      message: "One or more subtasks do not belong to this task.",
    }
  }

  await prisma.$transaction(async (transaction) => {
    let nextPosition = task.position

    if (task.columnId !== targetColumn.id) {
      const lastTargetTask = await transaction.task.findFirst({
        where: {
          columnId: targetColumn.id,
        },
        orderBy: {
          position: "desc",
        },
        select: {
          position: true,
        },
      })

      nextPosition = (lastTargetTask?.position ?? -1) + 1
    }

    await transaction.task.update({
      where: {
        id: task.id,
      },
      data: {
        title: result.data.title,
        description: result.data.description,
        columnId: targetColumn.id,
        position: nextPosition,
      },
    })

    await transaction.subtask.deleteMany({
      where: {
        taskId: task.id,
        id: {
          notIn: [...submittedSubtaskIds],
        },
      },
    })

    await transaction.subtask.updateMany({
      where: {
        taskId: task.id,
      },
      data: {
        position: {
          increment: 1000,
        },
      },
    })

    for (const [index, subtask] of result.data.subtasks.entries()) {
      if (subtask.id) {
        await transaction.subtask.update({
          where: {
            id: subtask.id,
          },
          data: {
            title: subtask.title,
            position: index,
          },
        })
      } else {
        await transaction.subtask.create({
          data: {
            taskId: task.id,
            title: subtask.title,
            position: index,
          },
        })
      }
    }
  })

  revalidatePath("/boards")

  return {
    success: true,
    taskId,
  }
}

export async function deleteTask(
  taskId: string,
): Promise<TaskActionResult> {
  const user = await requireCurrentUser()

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      column: {
        board: boardAccess(user.id),
      },
    },
    select: {
      id: true,
    },
  })

  if (!task) {
    return {
      success: false,
      message: "You do not have permission to delete this task.",
    }
  }

  await prisma.task.delete({
    where: {
      id: task.id,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
  }
}

export async function toggleSubtask(
  subtaskId: string,
  isCompleted: boolean,
): Promise<TaskActionResult> {
  const user = await requireCurrentUser()

  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      task: {
        column: {
          board: boardAccess(user.id),
        },
      },
    },
    select: {
      id: true,
    },
  })

  if (!subtask) {
    return {
      success: false,
      message: "You do not have permission to update this subtask.",
    }
  }

  await prisma.subtask.update({
    where: {
      id: subtask.id,
    },
    data: {
      isCompleted,
    },
  })

  revalidatePath("/boards")

  return {
    success: true,
  }
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  targetIndex: number,
): Promise<TaskActionResult> {
  const user = await requireCurrentUser()

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      column: {
        board: boardAccess(user.id),
      },
    },
    select: {
      id: true,
      columnId: true,
      column: {
        select: {
          boardId: true,
        },
      },
    },
  })

  if (!task) {
    return {
      success: false,
      message: "You do not have permission to move this task.",
    }
  }

  const board = await prisma.board.findFirst({
    where: {
      id: task.column.boardId,
      columns: {
        some: {
          id: targetColumnId,
        },
      },
      ...boardAccess(user.id),
    },
    select: {
      columns: {
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          tasks: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  })

  if (!board) {
    return {
      success: false,
      message: "The destination column does not belong to this board.",
    }
  }

  const orderedColumns = board.columns.map((column) => ({
    id: column.id,
    taskIds: column.tasks
      .map((item) => item.id)
      .filter((id) => id !== taskId),
  }))

  const targetColumn = orderedColumns.find(
    (column) => column.id === targetColumnId,
  )

  if (!targetColumn) {
    return {
      success: false,
      message: "The destination column could not be found.",
    }
  }

  const safeIndex = Math.max(
    0,
    Math.min(targetIndex, targetColumn.taskIds.length),
  )

  targetColumn.taskIds.splice(safeIndex, 0, taskId)

  await prisma.$transaction(async (transaction) => {
    await transaction.task.updateMany({
      where: {
        column: {
          boardId: task.column.boardId,
        },
      },
      data: {
        position: {
          increment: 1000000,
        },
      },
    })

    for (const column of orderedColumns) {
      for (const [position, orderedTaskId] of column.taskIds.entries()) {
        await transaction.task.update({
          where: {
            id: orderedTaskId,
          },
          data: {
            columnId: column.id,
            position,
          },
        })
      }
    }
  })

  revalidatePath("/boards")

  return {
    success: true,
    taskId,
  }
}