"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DragDropProvider,
  useDroppable,
  type DragDropEventHandlers,
} from "@dnd-kit/react"
import { Feedback } from "@dnd-kit/dom"
import { useSortable } from "@dnd-kit/react/sortable"
import { move } from "@dnd-kit/helpers"
import { GripVertical } from "lucide-react"
import { moveTask } from "@/actions/task-actions"
import type {
  WorkspaceBoard,
  WorkspaceColumn,
  WorkspaceTask,
} from "@/types/board"

type TaskGroups = Record<string, WorkspaceTask[]>

type SortableTaskColumnsProps = {
  board: WorkspaceBoard
  canManageBoard: boolean
  onEditBoard: () => void
  onSelectTask: (task: WorkspaceTask, columnId: string) => void
}

function createTaskGroups(board: WorkspaceBoard): TaskGroups {
  return Object.fromEntries(
    board.columns.map((column) => [column.id, column.tasks]),
  )
}

function cloneTaskGroups(groups: TaskGroups): TaskGroups {
  return Object.fromEntries(
    Object.entries(groups).map(([columnId, tasks]) => [
      columnId,
      [...tasks],
    ]),
  )
}

function findTaskPosition(groups: TaskGroups, taskId: string) {
  for (const [columnId, tasks] of Object.entries(groups)) {
    const index = tasks.findIndex((task) => task.id === taskId)

    if (index !== -1) {
      return {
        columnId,
        index,
      }
    }
  }

  return null
}

export function SortableTaskColumns({
  board,
  canManageBoard,
  onEditBoard,
  onSelectTask,
}: SortableTaskColumnsProps) {
  const router = useRouter()
  const [taskGroups, setTaskGroups] = useState<TaskGroups>(() =>
    createTaskGroups(board),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const taskGroupsRef = useRef(taskGroups)
  const snapshotRef = useRef(cloneTaskGroups(taskGroups))

  useEffect(() => {
    const nextGroups = createTaskGroups(board)

    setTaskGroups(nextGroups)
    taskGroupsRef.current = nextGroups
    snapshotRef.current = cloneTaskGroups(nextGroups)
  }, [board])

  const handleDragStart = useCallback<
    DragDropEventHandlers["onDragStart"]
  >(() => {
    snapshotRef.current = cloneTaskGroups(taskGroupsRef.current)
    setError("")
  }, [])

  const handleDragOver = useCallback<
    DragDropEventHandlers["onDragOver"]
  >(
    (event) => {
      const { source } = event.operation

      if (isSaving || !source || source.type !== "task") {
        return
      }

      setTaskGroups((currentGroups) => {
        const nextGroups = move(currentGroups, event)
        taskGroupsRef.current = nextGroups
        return nextGroups
      })
    },
    [isSaving],
  )

  const handleDragEnd = useCallback<DragDropEventHandlers["onDragEnd"]>(
    async (event) => {
      const { source, target } = event.operation

      if (event.canceled || !source || !target) {
        const previousGroups = cloneTaskGroups(snapshotRef.current)

        taskGroupsRef.current = previousGroups
        setTaskGroups(previousGroups)
        return
      }

      if (source.type !== "task") {
        return
      }

      const taskId = String(source.id)
      const previousPosition = findTaskPosition(
        snapshotRef.current,
        taskId,
      )
      const nextPosition = findTaskPosition(
        taskGroupsRef.current,
        taskId,
      )

      if (!previousPosition || !nextPosition) {
        const previousGroups = cloneTaskGroups(snapshotRef.current)

        taskGroupsRef.current = previousGroups
        setTaskGroups(previousGroups)
        return
      }

      const positionChanged =
        previousPosition.columnId !== nextPosition.columnId ||
        previousPosition.index !== nextPosition.index

      if (!positionChanged) {
        return
      }

      setIsSaving(true)
      setError("")

      try {
        const result = await moveTask(
          taskId,
          nextPosition.columnId,
          nextPosition.index,
        )

        if (!result.success) {
          const previousGroups = cloneTaskGroups(snapshotRef.current)

          taskGroupsRef.current = previousGroups
          setTaskGroups(previousGroups)
          setError(result.message)
        } else {
          router.refresh()
        }
      } catch {
        const previousGroups = cloneTaskGroups(snapshotRef.current)

        taskGroupsRef.current = previousGroups
        setTaskGroups(previousGroups)
        setError("The task could not be moved. Please try again.")
      } finally {
        setIsSaving(false)
      }
    },
    [router],
  )

  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({
          dropAnimation: null,
        }),
      ]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex min-h-full min-w-max gap-6 p-6">
        {error && (
          <div
            role="alert"
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-red px-4 py-3 text-sm font-bold text-white shadow-xl"
          >
            {error}
          </div>
        )}

        {board.columns.map((column) => (
          <SortableColumn
            key={column.id}
            column={column}
            tasks={taskGroups[column.id] ?? []}
            disabled={isSaving}
            onSelectTask={onSelectTask}
          />
        ))}

        {canManageBoard && (
          <button
            type="button"
            onClick={onEditBoard}
            className="mt-9 flex h-[calc(100vh-156px)] w-70 shrink-0 items-center justify-center rounded-md bg-(--surface) text-2xl font-bold text-medium-grey transition hover:text-purple"
          >
            + New Column
          </button>
        )}
      </div>
    </DragDropProvider>
  )
}

type SortableColumnProps = {
  column: WorkspaceColumn
  tasks: WorkspaceTask[]
  disabled: boolean
  onSelectTask: (task: WorkspaceTask, columnId: string) => void
}

function SortableColumn({
  column,
  tasks,
  disabled,
  onSelectTask,
}: SortableColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    type: "column",
    accept: "task",
    collisionPriority: -1,
    data: {
      group: column.id,
    },
  })

  return (
    <section className="w-70 shrink-0">
      <div className="mb-6 flex items-center">
        <span
          className="mr-3 h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: column.color }}
        />

        <h2 className="text-xs font-bold uppercase tracking-[2.4px] text-medium-grey">
          {column.name} ({tasks.length})
        </h2>
      </div>

      <div
        ref={(element) => ref(element)}
        className={`min-h-24 space-y-5 rounded-lg transition-colors ${
          isDropTarget ? "bg-purple/10" : ""
        }`}
      >
        {tasks.map((task, index) => (
          <SortableTaskCard
            key={task.id}
            task={task}
            columnId={column.id}
            index={index}
            disabled={disabled}
            onSelectTask={onSelectTask}
          />
        ))}

        {tasks.length === 0 && (
          <div
            className={`flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed px-4 text-center text-xs font-bold transition ${
              isDropTarget
                ? "border-purple text-purple"
                : "border-(--border) text-medium-grey"
            }`}
          >
            Drop a task here
          </div>
        )}
      </div>
    </section>
  )
}

type SortableTaskCardProps = {
  task: WorkspaceTask
  columnId: string
  index: number
  disabled: boolean
  onSelectTask: (task: WorkspaceTask, columnId: string) => void
}

function SortableTaskCard({
  task,
  columnId,
  index,
  disabled,
  onSelectTask,
}: SortableTaskCardProps) {
  const { ref, handleRef, isDragging, isDropping } = useSortable({
    id: task.id,
    index,
    group: columnId,
    type: "task",
    accept: "task",
    data: {
      group: columnId,
    },
  })

  const completed = task.subtasks.filter(
    (subtask) => subtask.isCompleted,
  ).length

  return (
    <article
      ref={(element) => ref(element)}
      className={`group relative rounded-lg bg-(--surface) shadow-md shadow-black/5 transition-[opacity,box-shadow] ${
        isDragging ? "opacity-40 shadow-xl" : "opacity-100"
      } ${isDropping ? "ring-2 ring-purple/40" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSelectTask(task, columnId)}
        className="w-full rounded-lg px-4 py-6 pr-11 text-left transition-shadow hover:shadow-lg"
      >
        <h3 className="text-[15px] font-bold leading-5 text-(--text-primary) transition hover:text-purple">
          {task.title}
        </h3>

        <p className="mt-2 text-xs font-bold text-medium-grey">
          {completed} of {task.subtasks.length} subtasks
        </p>
      </button>

      <button
        ref={(element) => handleRef(element)}
        type="button"
        disabled={disabled}
        className="absolute right-2 top-1/2 flex h-10 w-8 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-md text-medium-grey opacity-60 transition hover:bg-purple/10 hover:text-purple active:cursor-grabbing disabled:cursor-wait md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        aria-label={`Drag ${task.title}`}
      >
        <GripVertical size={18} />
      </button>
    </article>
  )
}