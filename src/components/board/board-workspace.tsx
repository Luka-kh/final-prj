"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  ChevronDown,
  Eye,
  EyeOff,
  LayoutDashboard,
  MoreVertical,
  Plus,
  Users,
} from "lucide-react"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { AddBoardModal } from "@/components/board/add-board-modal"
import { DeleteBoardModal } from "@/components/board/delete-board-modal"
import { EditBoardModal } from "@/components/board/edit-board-modal"
import { SortableTaskColumns } from "@/components/board/sortable-task-columns"
import { BoardSharingModal } from "@/components/collaboration/board-sharing-modal"
import { FriendsModal } from "@/components/friends/friends-modal"
import { AddTaskModal } from "@/components/task/add-task-modal"
import { DeleteTaskModal } from "@/components/task/delete-task-modal"
import { EditTaskModal } from "@/components/task/edit-task-modal"
import { ViewTaskModal } from "@/components/task/view-task-modal"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import type { WorkspaceBoard, WorkspaceTask } from "@/types/board"

type BoardWorkspaceProps = {
  boards: WorkspaceBoard[]
  activeBoard: WorkspaceBoard | null
  currentUserId: string
  currentUserName: string
}

type SelectedTask = {
  task: WorkspaceTask
  columnId: string
}

export function BoardWorkspace({
  boards,
  activeBoard,
  currentUserId,
  currentUserName,
}: BoardWorkspaceProps) {
  const router = useRouter()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [addBoardOpen, setAddBoardOpen] = useState(false)
  const [editBoardOpen, setEditBoardOpen] = useState(false)
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [viewTaskOpen, setViewTaskOpen] = useState(false)
  const [editTaskOpen, setEditTaskOpen] = useState(false)
  const [deleteTaskOpen, setDeleteTaskOpen] = useState(false)
  const [boardMenuOpen, setBoardMenuOpen] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [boardSharingOpen, setBoardSharingOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(
    null,
  )

  const canManageBoard = activeBoard?.ownerId === currentUserId

  function selectBoard(boardId: string) {
    router.push(`/boards?board=${boardId}`)
    setMobileMenuOpen(false)
  }

  function openTask(task: WorkspaceTask, columnId: string) {
    setSelectedTask({
      task,
      columnId,
    })
    setViewTaskOpen(true)
  }

  function closeViewTask() {
    setViewTaskOpen(false)
    setSelectedTask(null)
  }

  function closeEditTask() {
    setEditTaskOpen(false)
    setSelectedTask(null)
  }

  function closeDeleteTask() {
    setDeleteTaskOpen(false)
    setSelectedTask(null)
  }

  return (
    <div className="h-screen overflow-hidden bg-(--page-background)">
      <DesktopSidebar
        boards={boards}
        activeBoardId={activeBoard?.id}
        visible={sidebarVisible}
        currentUserName={currentUserName}
        onSelectBoard={selectBoard}
        onAddBoard={() => setAddBoardOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
        onHide={() => setSidebarVisible(false)}
      />

      <header
        className={`fixed right-0 top-0 z-30 hidden h-24 items-center border-b border-(--border) bg-(--surface) transition-[left] duration-300 md:flex ${
          sidebarVisible ? "left-75" : "left-0"
        }`}
      >
        {!sidebarVisible && (
          <div className="flex h-full w-52 shrink-0 items-center border-r border-(--border) px-6">
            <Logo />
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center justify-between px-6">
          <h1 className="truncate text-xl font-bold text-(--text-primary)">
            {activeBoard?.name ?? "No board selected"}
          </h1>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAddTaskOpen(true)}
              disabled={!activeBoard || activeBoard.columns.length === 0}
              className="flex h-12 items-center rounded-full bg-purple px-6 text-sm font-bold text-white transition hover:bg-purple-hover disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={18} strokeWidth={3} />
              <span className="ml-1">Add New Task</span>
            </button>

            <button
              type="button"
              onClick={() => setBoardMenuOpen((current) => !current)}
              disabled={!activeBoard}
              className="flex h-10 w-6 items-center justify-center text-medium-grey transition hover:text-purple disabled:opacity-30"
              aria-label="Board options"
            >
              <MoreVertical size={24} />
            </button>
          </div>
        </div>
      </header>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-(--border) bg-(--surface) px-4 md:hidden">
        <Logo compact />

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ml-4 flex min-w-0 flex-1 items-center"
        >
          <span className="truncate text-lg font-bold text-(--text-primary)">
            {activeBoard?.name ?? "Select a board"}
          </span>

          <ChevronDown
            size={16}
            className={`ml-2 shrink-0 text-purple transition-transform ${
              mobileMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setAddTaskOpen(true)}
          disabled={!activeBoard || activeBoard.columns.length === 0}
          className="ml-3 flex h-8 w-12 items-center justify-center rounded-full bg-purple text-white transition hover:bg-purple-hover disabled:opacity-30"
          aria-label="Add new task"
        >
          <Plus size={20} strokeWidth={3} />
        </button>

        <button
          type="button"
          onClick={() => setBoardMenuOpen((current) => !current)}
          disabled={!activeBoard}
          className="ml-2 flex h-9 w-5 items-center justify-center text-medium-grey disabled:opacity-30"
          aria-label="Board options"
        >
          <MoreVertical size={22} />
        </button>
      </header>

      <BoardOptionsMenu
        open={boardMenuOpen}
        canManageBoard={canManageBoard}
        onClose={() => setBoardMenuOpen(false)}
        onShare={() => {
          setBoardMenuOpen(false)
          setBoardSharingOpen(true)
        }}
        onEdit={() => {
          setBoardMenuOpen(false)
          setEditBoardOpen(true)
        }}
        onDelete={() => {
          setBoardMenuOpen(false)
          setDeleteBoardOpen(true)
        }}
      />

      <MobileBoardMenu
        open={mobileMenuOpen}
        boards={boards}
        activeBoardId={activeBoard?.id}
        onClose={() => setMobileMenuOpen(false)}
        onSelectBoard={selectBoard}
        onAddBoard={() => {
          setMobileMenuOpen(false)
          setAddBoardOpen(true)
        }}
        onOpenFriends={() => {
          setMobileMenuOpen(false)
          setFriendsOpen(true)
        }}
      />

      <main
        className={`h-full overflow-auto pt-16 transition-[margin] duration-300 md:pt-24 ${
          sidebarVisible ? "md:ml-75" : "md:ml-0"
        }`}
      >
        <BoardContent
          board={activeBoard}
          canManageBoard={canManageBoard}
          onAddBoard={() => setAddBoardOpen(true)}
          onEditBoard={() => setEditBoardOpen(true)}
          onSelectTask={openTask}
        />
      </main>

      <AnimatePresence>
        {!sidebarVisible && (
          <motion.button
            type="button"
            initial={{ x: -60 }}
            animate={{ x: 0 }}
            exit={{ x: -60 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarVisible(true)}
            className="fixed bottom-8 left-0 z-30 hidden h-12 w-14 items-center justify-center rounded-r-full bg-purple text-white transition hover:bg-purple-hover md:flex"
            aria-label="Show sidebar"
          >
            <Eye size={19} />
          </motion.button>
        )}
      </AnimatePresence>

      <AddBoardModal
        open={addBoardOpen}
        onClose={() => setAddBoardOpen(false)}
      />

      <EditBoardModal
        board={activeBoard}
        open={editBoardOpen && canManageBoard}
        onClose={() => setEditBoardOpen(false)}
      />

      <DeleteBoardModal
        board={activeBoard}
        open={deleteBoardOpen && canManageBoard}
        onClose={() => setDeleteBoardOpen(false)}
      />

      <AddTaskModal
        board={activeBoard}
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
      />

      <ViewTaskModal
        task={selectedTask?.task ?? null}
        columnId={selectedTask?.columnId ?? ""}
        board={activeBoard}
        open={viewTaskOpen}
        onClose={closeViewTask}
        onEdit={() => {
          setViewTaskOpen(false)
          setEditTaskOpen(true)
        }}
        onDelete={() => {
          setViewTaskOpen(false)
          setDeleteTaskOpen(true)
        }}
      />

      <EditTaskModal
        task={selectedTask?.task ?? null}
        columnId={selectedTask?.columnId ?? ""}
        board={activeBoard}
        open={editTaskOpen}
        onClose={closeEditTask}
      />

      <DeleteTaskModal
        task={selectedTask?.task ?? null}
        open={deleteTaskOpen}
        onClose={closeDeleteTask}
      />

      <FriendsModal
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
      />

      <BoardSharingModal
        boardId={activeBoard?.id ?? null}
        open={boardSharingOpen && canManageBoard}
        onClose={() => setBoardSharingOpen(false)}
      />
    </div>
  )
}

type BoardOptionsMenuProps = {
  open: boolean
  canManageBoard: boolean
  onClose: () => void
  onShare: () => void
  onEdit: () => void
  onDelete: () => void
}

function BoardOptionsMenu({
  open,
  canManageBoard,
  onClose,
  onShare,
  onEdit,
  onDelete,
}: BoardOptionsMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute right-4 top-16 w-48 rounded-lg bg-(--surface) p-4 shadow-2xl md:right-6 md:top-20"
          >
            {canManageBoard ? (
              <>
                <button
                  type="button"
                  onClick={onShare}
                  className="block h-9 w-full text-left text-sm font-medium text-medium-grey transition hover:text-purple"
                >
                  Share Board
                </button>

                <button
                  type="button"
                  onClick={onEdit}
                  className="block h-9 w-full text-left text-sm font-medium text-medium-grey transition hover:text-purple"
                >
                  Edit Board
                </button>

                <button
                  type="button"
                  onClick={onDelete}
                  className="block h-9 w-full text-left text-sm font-medium text-red transition hover:bg-red/5"
                >
                  Delete Board
                </button>
              </>
            ) : (
              <p className="text-xs font-medium leading-5 text-medium-grey">
                Only the board owner can manage this board.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type DesktopSidebarProps = {
  boards: WorkspaceBoard[]
  activeBoardId?: string
  visible: boolean
  currentUserName: string
  onSelectBoard: (boardId: string) => void
  onAddBoard: () => void
  onOpenFriends: () => void
  onHide: () => void
}

function DesktopSidebar({
  boards,
  activeBoardId,
  visible,
  currentUserName,
  onSelectBoard,
  onAddBoard,
  onOpenFriends,
  onHide,
}: DesktopSidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden w-75 flex-col border-r border-(--border) bg-(--surface) transition-transform duration-300 md:flex ${
        visible ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-24 shrink-0 items-center px-8">
        <Logo />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-5">
        <p className="px-8 pb-4 text-xs font-bold tracking-[2.4px] text-medium-grey">
          ALL BOARDS ({boards.length})
        </p>

        <nav className="pr-6">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => onSelectBoard(board.id)}
              className={`flex h-12 w-full items-center rounded-r-full px-8 text-left text-sm font-bold transition ${
                board.id === activeBoardId
                  ? "bg-purple text-white"
                  : "text-medium-grey hover:bg-purple/10 hover:text-purple"
              }`}
            >
              <LayoutDashboard className="mr-3 shrink-0" size={17} />
              <span className="truncate">{board.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={onAddBoard}
            className="flex h-12 w-full items-center rounded-r-full px-8 text-sm font-bold text-purple transition hover:bg-purple/10"
          >
            <LayoutDashboard className="mr-3" size={17} />
            + Create New Board
          </button>

          <button
            type="button"
            onClick={onOpenFriends}
            className="flex h-12 w-full items-center rounded-r-full px-8 text-sm font-bold text-medium-grey transition hover:bg-purple/10 hover:text-purple"
          >
            <Users className="mr-3" size={17} />
            Friends
          </button>
        </nav>
      </div>

      <div className="shrink-0 px-6 pb-8">
        <p className="mb-3 truncate px-2 text-xs font-bold text-medium-grey">
          Signed in as {currentUserName}
        </p>

        <ThemeToggle />

        <button
          type="button"
          onClick={onHide}
          className="mt-3 flex h-10 w-full items-center px-2 text-sm font-bold text-medium-grey transition hover:text-purple"
        >
          <EyeOff className="mr-3" size={17} />
          Hide Sidebar
        </button>

        <SignOutButton />
      </div>
    </aside>
  )
}

type MobileBoardMenuProps = {
  open: boolean
  boards: WorkspaceBoard[]
  activeBoardId?: string
  onClose: () => void
  onSelectBoard: (boardId: string) => void
  onAddBoard: () => void
  onOpenFriends: () => void
}

function MobileBoardMenu({
  open,
  boards,
  activeBoardId,
  onClose,
  onSelectBoard,
  onAddBoard,
  onOpenFriends,
}: MobileBoardMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-20 bg-black/50 pt-20 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="mx-auto w-[calc(100%-48px)] max-w-66 rounded-lg bg-(--surface) py-4 shadow-2xl"
          >
            <p className="px-6 pb-3 text-xs font-bold tracking-[2.4px] text-medium-grey">
              ALL BOARDS ({boards.length})
            </p>

            <nav className="pr-4">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => onSelectBoard(board.id)}
                  className={`flex h-12 w-full items-center rounded-r-full px-6 text-left text-sm font-bold ${
                    board.id === activeBoardId
                      ? "bg-purple text-white"
                      : "text-medium-grey"
                  }`}
                >
                  <LayoutDashboard className="mr-3" size={17} />
                  <span className="truncate">{board.name}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={onAddBoard}
                className="flex h-12 w-full items-center rounded-r-full px-6 text-sm font-bold text-purple"
              >
                <LayoutDashboard className="mr-3" size={17} />
                + Create New Board
              </button>

              <button
                type="button"
                onClick={onOpenFriends}
                className="flex h-12 w-full items-center rounded-r-full px-6 text-sm font-bold text-medium-grey"
              >
                <Users className="mr-3" size={17} />
                Friends
              </button>
            </nav>

            <div className="mx-4 mt-3">
              <ThemeToggle />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type BoardContentProps = {
  board: WorkspaceBoard | null
  canManageBoard: boolean
  onAddBoard: () => void
  onEditBoard: () => void
  onSelectTask: (task: WorkspaceTask, columnId: string) => void
}

function BoardContent({
  board,
  canManageBoard,
  onAddBoard,
  onEditBoard,
  onSelectTask,
}: BoardContentProps) {
  if (!board) {
    return (
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-bold text-medium-grey">
            You don&apos;t have any boards yet.
          </p>

          <button
            type="button"
            onClick={onAddBoard}
            className="mt-6 h-12 rounded-full bg-purple px-6 text-sm font-bold text-white transition hover:bg-purple-hover"
          >
            + Create New Board
          </button>
        </div>
      </div>
    )
  }

  if (board.columns.length === 0) {
    return (
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-bold text-medium-grey">
            {canManageBoard
              ? "This board is empty. Create a new column to get started."
              : "This board does not have any columns yet."}
          </p>

          {canManageBoard && (
            <button
              type="button"
              onClick={onEditBoard}
              className="mt-6 h-12 rounded-full bg-purple px-6 text-sm font-bold text-white transition hover:bg-purple-hover"
            >
              + Add New Column
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <SortableTaskColumns
      board={board}
      canManageBoard={canManageBoard}
      onEditBoard={onEditBoard}
      onSelectTask={onSelectTask}
    />
  )
}