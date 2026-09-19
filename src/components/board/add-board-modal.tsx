"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { LoaderCircle, X } from "lucide-react"
import { createBoard } from "@/actions/board-actions"
import { Modal } from "@/components/ui/modal"

type AddBoardModalProps = {
  open: boolean
  onClose: () => void
}

type ColumnInput = {
  key: string
  name: string
}

const initialColumns: ColumnInput[] = [
  { key: "todo", name: "Todo" },
  { key: "doing", name: "Doing" },
]

export function AddBoardModal({ open, onClose }: AddBoardModalProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [columns, setColumns] = useState<ColumnInput[]>(initialColumns)
  const [nameError, setNameError] = useState("")
  const [columnsError, setColumnsError] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName("")
      setColumns(initialColumns)
      setNameError("")
      setColumnsError("")
      setFormError("")
      setIsSubmitting(false)
    }
  }, [open])

  function addColumn() {
    setColumns((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        name: "",
      },
    ])
    setColumnsError("")
  }

  function updateColumn(key: string, value: string) {
    setColumns((current) =>
      current.map((column) =>
        column.key === key ? { ...column, name: value } : column,
      ),
    )
    setColumnsError("")
    setFormError("")
  }

  function removeColumn(key: string) {
    setColumns((current) => current.filter((column) => column.key !== key))
    setColumnsError("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    const hasEmptyColumn = columns.some((column) => !column.name.trim())

    setNameError(trimmedName ? "" : "Can’t be empty")
    setColumnsError(hasEmptyColumn ? "Column names can’t be empty" : "")
    setFormError("")

    if (!trimmedName || hasEmptyColumn) {
      return
    }

    setIsSubmitting(true)

    const result = await createBoard({
      name: trimmedName,
      columns: columns.map((column) => ({
        name: column.name.trim(),
      })),
    })

    if (!result.success) {
      setNameError(result.fieldErrors?.name ?? "")
      setColumnsError(result.fieldErrors?.columns ?? "")
      setFormError(result.message)
      setIsSubmitting(false)
      return
    }

    onClose()
    router.push(result.boardId ? `/boards?board=${result.boardId}` : "/boards")
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} closeOnOverlay={!isSubmitting}>
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold text-(--text-primary)">
          Add New Board
        </h2>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Board Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
                setFormError("")
              }}
              placeholder="e.g. Web Design"
              className={`h-10 w-full rounded-sm border bg-transparent px-4 pr-28 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/50 ${
                nameError
                  ? "border-red"
                  : "border-(--border) hover:border-purple focus:border-purple"
              }`}
            />
            {nameError && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-red">
                {nameError}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold text-medium-grey">
            Board Columns
          </label>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {columns.map((column) => (
                <motion.div
                  key={column.key}
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 40, y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={column.name}
                    onChange={(event) =>
                      updateColumn(column.key, event.target.value)
                    }
                    placeholder="e.g. Done"
                    className={`h-10 min-w-0 flex-1 rounded-sm border bg-transparent px-4 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey/50 ${
                      columnsError && !column.name.trim()
                        ? "border-red"
                        : "border-(--border) hover:border-purple focus:border-purple"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(column.key)}
                    className="flex h-10 w-6 shrink-0 items-center justify-center text-medium-grey transition hover:text-red"
                    aria-label={`Remove ${column.name || "column"}`}
                  >
                    <X size={21} strokeWidth={3} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {columnsError && (
            <p className="mt-2 text-xs font-medium text-red" role="alert">
              {columnsError}
            </p>
          )}

          <button
            type="button"
            onClick={addColumn}
            className="mt-3 h-10 w-full rounded-full bg-purple/10 text-xs font-bold text-purple transition hover:bg-purple/20 dark:bg-white"
          >
            + Add New Column
          </button>
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
          className="mt-6 flex h-10 w-full items-center justify-center rounded-full bg-purple text-xs font-bold text-white transition hover:bg-purple-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="mr-2 animate-spin" size={16} />
              Creating board
            </>
          ) : (
            "Create New Board"
          )}
        </motion.button>
      </form>
    </Modal>
  )
}