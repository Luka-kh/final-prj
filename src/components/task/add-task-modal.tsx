"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, LoaderCircle, X } from "lucide-react"
import { createTask } from "@/actions/task-actions"
import { Modal } from "@/components/ui/modal"
import type { WorkspaceBoard } from "@/types/board"

type AddTaskModalProps = {
  board: WorkspaceBoard | null
  open: boolean
  onClose: () => void
}

type SubtaskInput = {
  key: string
  title: string
}

const initialSubtasks: SubtaskInput[] = [
  {
    key: "first-subtask",
    title: "",
  },
  {
    key: "second-subtask",
    title: "",
  },
]

export function AddTaskModal({
  board,
  open,
  onClose,
}: AddTaskModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [columnId, setColumnId] = useState("")
  const [subtasks, setSubtasks] =
    useState<SubtaskInput[]>(initialSubtasks)
  const [titleError, setTitleError] = useState("")
  const [subtasksError, setSubtasksError] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && board) {
      setTitle("")
      setDescription("")
      setColumnId(board.columns[0]?.id ?? "")
      setSubtasks(initialSubtasks)
      setTitleError("")
      setSubtasksError("")
      setFormError("")
      setIsSubmitting(false)
    }
  }, [board, open])

  function addSubtask() {
    setSubtasks((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        title: "",
      },
    ])
    setSubtasksError("")
  }

  function updateSubtask(key: string, value: string) {
    setSubtasks((current) =>
      current.map((subtask) =>
        subtask.key === key ? { ...subtask, title: value } : subtask,
      ),
    )
    setSubtasksError("")
    setFormError("")
  }

  function removeSubtask(key: string) {
    setSubtasks((current) =>
      current.filter((subtask) => subtask.key !== key),
    )
    setSubtasksError("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const hasEmptySubtask = subtasks.some(
      (subtask) => !subtask.title.trim(),
    )

    setTitleError(trimmedTitle ? "" : "Can’t be empty")
    setSubtasksError(hasEmptySubtask ? "Subtasks can’t be empty" : "")
    setFormError("")

    if (!trimmedTitle || !columnId || hasEmptySubtask) {
      return
    }

    setIsSubmitting(true)

    const result = await createTask({
      title: trimmedTitle,
      description: description.trim(),
      columnId,
      subtasks: subtasks.map((subtask) => ({
        title: subtask.title.trim(),
      })),
    })

    if (!result.success) {
      setTitleError(result.fieldErrors?.title ?? "")
      setSubtasksError(result.fieldErrors?.subtasks ?? "")
      setFormError(result.message)
      setIsSubmitting(false)
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} closeOnOverlay={!isSubmitting}>
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold text-(--text-primary)">
          Add New Task
        </h2>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Title
          </label>

          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setTitleError("")
                setFormError("")
              }}
              placeholder="e.g. Take coffee break"
              className={`h-10 w-full rounded-sm border bg-transparent px-4 pr-28 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/50 ${
                titleError
                  ? "border-red"
                  : "border-(--border) hover:border-purple focus:border-purple"
              }`}
            />

            {titleError && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-red">
                {titleError}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Description
          </label>

          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              setFormError("")
            }}
            placeholder="e.g. It’s always good to take a break. This 15 minute break will recharge the batteries a little."
            rows={4}
            className="w-full resize-none rounded-sm border border-(--border) bg-transparent px-4 py-3 text-sm font-medium leading-6 text-(--text-primary) outline-none transition placeholder:text-medium-grey/50 hover:border-purple focus:border-purple"
          />
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Subtasks
          </label>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {subtasks.map((subtask) => (
                <motion.div
                  key={subtask.key}
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 40, y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(event) =>
                      updateSubtask(subtask.key, event.target.value)
                    }
                    placeholder="e.g. Make coffee"
                    className={`h-10 min-w-0 flex-1 rounded-sm border bg-transparent px-4 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/50 ${
                      subtasksError && !subtask.title.trim()
                        ? "border-red"
                        : "border-(--border) hover:border-purple focus:border-purple"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => removeSubtask(subtask.key)}
                    className="flex h-10 w-6 shrink-0 items-center justify-center text-medium-grey transition hover:text-red"
                    aria-label="Remove subtask"
                  >
                    <X size={21} strokeWidth={3} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {subtasksError && (
            <p className="mt-2 text-xs font-medium text-red" role="alert">
              {subtasksError}
            </p>
          )}

          <button
            type="button"
            onClick={addSubtask}
            className="mt-3 h-10 w-full rounded-full bg-purple/10 text-xs font-bold text-purple transition hover:bg-purple/20 dark:bg-white"
          >
            + Add New Subtask
          </button>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Status
          </label>

          <div className="relative">
            <select
              value={columnId}
              onChange={(event) => setColumnId(event.target.value)}
              className="h-10 w-full appearance-none rounded-sm border border-(--border) bg-(--surface) px-4 pr-10 text-sm font-medium text-(--text-primary) outline-none transition hover:border-purple focus:border-purple"
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

        {formError && (
          <p
            className="mt-4 rounded-md bg-red/10 px-4 py-3 text-xs font-medium text-red"
            role="alert"
          >
            {formError}
          </p>
        )}

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={isSubmitting ? undefined : { scale: 0.98 }}
          className="mt-6 flex h-10 w-full items-center justify-center rounded-full bg-purple text-xs font-bold text-white transition hover:bg-purple-hover disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="mr-2 animate-spin" size={16} />
              Creating task
            </>
          ) : (
            "Create Task"
          )}
        </motion.button>
      </form>
    </Modal>
  )
}