"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Check, ChevronDown, MoreVertical } from "lucide-react"
import { toggleSubtask, updateTask } from "@/actions/task-actions"
import { Modal } from "@/components/ui/modal"
import type {
  WorkspaceBoard,
  WorkspaceSubtask,
  WorkspaceTask,
} from "@/types/board"

type ViewTaskModalProps = {
  task: WorkspaceTask | null
  columnId: string
  board: WorkspaceBoard | null
  open: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ViewTaskModal({
  task,
  columnId,
  board,
  open,
  onClose,
  onEdit,
  onDelete,
}: ViewTaskModalProps) {
  const router = useRouter()
  const [subtasks, setSubtasks] = useState<WorkspaceSubtask[]>([])
  const [currentColumnId, setCurrentColumnId] = useState(columnId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [busySubtaskId, setBusySubtaskId] = useState("")
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && task) {
      setSubtasks(task.subtasks)
      setCurrentColumnId(columnId)
      setMenuOpen(false)
      setBusySubtaskId("")
      setIsChangingStatus(false)
      setError("")
    }
  }, [columnId, open, task])

  if (!task) {
    return null
  }

  const completedSubtasks = subtasks.filter(
    (subtask) => subtask.isCompleted,
  ).length

  async function handleSubtaskChange(
    subtaskId: string,
    isCompleted: boolean,
  ) {
    const previousSubtasks = subtasks

    setBusySubtaskId(subtaskId)
    setError("")
    setSubtasks((current) =>
      current.map((subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              isCompleted,
            }
          : subtask,
      ),
    )

    const result = await toggleSubtask(subtaskId, isCompleted)

    if (!result.success) {
      setSubtasks(previousSubtasks)
      setError(result.message)
    } else {
      router.refresh()
    }

    setBusySubtaskId("")
  }

 async function handleStatusChange(nextColumnId: string) {
  if (!task) {
    return
  }

  const previousColumnId = currentColumnId

  setCurrentColumnId(nextColumnId)
  setIsChangingStatus(true)
  setError("")

  const result = await updateTask(task.id, {
    title: task.title,
    description: task.description,
    columnId: nextColumnId,
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
    })),
  })

  if (!result.success) {
    setCurrentColumnId(previousColumnId)
    setError(result.message)
  } else {
    router.refresh()
  }

  setIsChangingStatus(false)
}

  return (
    <Modal open={open} onClose={onClose}>
      <div className="relative">
        <div className="flex items-start justify-between gap-5">
          <h2 className="text-lg font-bold leading-6 text-(--text-primary)">
            {task.title}
          </h2>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-8 w-6 shrink-0 items-center justify-center text-medium-grey transition hover:text-purple"
            aria-label="Task options"
          >
            <MoreVertical size={23} />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              className="absolute right-0 top-10 z-10 w-48 rounded-lg bg-(--page-background) p-4 shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="block h-9 w-full text-left text-sm font-medium text-medium-grey transition hover:text-purple"
              >
                Edit Task
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="block h-9 w-full text-left text-sm font-medium text-red transition hover:bg-red/5"
              >
                Delete Task
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {task.description && (
          <p className="mt-6 text-sm font-medium leading-6 text-medium-grey">
            {task.description}
          </p>
        )}

        <div className="mt-6">
          <p className="mb-4 text-xs font-bold text-(--text-primary)">
            Subtasks ({completedSubtasks} of {subtasks.length})
          </p>

          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <label
                key={subtask.id}
                className="flex min-h-10 cursor-pointer items-center rounded-sm bg-(--page-background) px-3 py-2.5 transition hover:bg-purple/20"
              >
                <input
                  type="checkbox"
                  checked={subtask.isCompleted}
                  disabled={busySubtaskId === subtask.id}
                  onChange={(event) =>
                    handleSubtaskChange(
                      subtask.id,
                      event.target.checked,
                    )
                  }
                  className="sr-only"
                />

                <span
                  className={`mr-4 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition ${
                    subtask.isCompleted
                      ? "border-purple bg-purple"
                      : "border-(--border) bg-(--surface)"
                  }`}
                >
                  {subtask.isCompleted && (
                    <Check size={12} strokeWidth={4} className="text-white" />
                  )}
                </span>

                <span
                  className={`text-xs font-bold transition ${
                    subtask.isCompleted
                      ? "text-medium-grey line-through"
                      : "text-(--text-primary)"
                  }`}
                >
                  {subtask.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Current Status
          </label>

          <div className="relative">
            <select
              value={currentColumnId}
              disabled={isChangingStatus}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="h-10 w-full appearance-none rounded-sm border border-(--border) bg-(--surface) px-4 pr-10 text-sm font-medium text-(--text-primary) outline-none transition hover:border-purple focus:border-purple disabled:opacity-60"
            >
              {board?.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-purple"
            />
          </div>
        </div>

        {error && (
          <p
            className="mt-4 rounded-md bg-red/10 px-4 py-3 text-xs font-medium text-red"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}