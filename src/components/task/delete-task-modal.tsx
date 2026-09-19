"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { motion } from "motion/react"
import { deleteTask } from "@/actions/task-actions"
import { Modal } from "@/components/ui/modal"
import type { WorkspaceTask } from "@/types/board"

type DeleteTaskModalProps = {
  task: WorkspaceTask | null
  open: boolean
  onClose: () => void
}

export function DeleteTaskModal({
  task,
  open,
  onClose,
}: DeleteTaskModalProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    if (!task) {
      return
    }

    setIsDeleting(true)
    setError("")

    const result = await deleteTask(task.id)

    if (!result.success) {
      setError(result.message)
      setIsDeleting(false)
      return
    }

    onClose()
    router.refresh()
  }

  function handleClose() {
    if (!isDeleting) {
      setError("")
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeOnOverlay={!isDeleting}
    >
      <h2 className="text-lg font-bold text-red">Delete this task?</h2>

      <p className="mt-6 text-sm font-medium leading-6 text-medium-grey">
        Are you sure you want to delete the “{task?.title}” task and its
        subtasks? This action cannot be reversed.
      </p>

      {error && (
        <p
          className="mt-4 rounded-md bg-red/10 px-4 py-3 text-xs font-medium text-red"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <motion.button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          whileTap={isDeleting ? undefined : { scale: 0.98 }}
          className="flex h-10 flex-1 items-center justify-center rounded-full bg-red text-xs font-bold text-white transition hover:bg-red-hover disabled:opacity-60"
        >
          {isDeleting ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            "Delete"
          )}
        </motion.button>

        <button
          type="button"
          onClick={handleClose}
          disabled={isDeleting}
          className="h-10 flex-1 rounded-full bg-purple/10 text-xs font-bold text-purple transition hover:bg-purple/20 disabled:opacity-60 dark:bg-white"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}