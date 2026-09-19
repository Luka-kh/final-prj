import { redirect } from "next/navigation"
import { BoardWorkspace } from "@/components/board/board-workspace"
import { getBoardsForUser } from "@/lib/boards"
import { getCurrentUser } from "@/lib/session"

type BoardsPageProps = {
  searchParams: Promise<{
    board?: string
  }>
}

export default async function BoardsPage({
  searchParams,
}: BoardsPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const params = await searchParams
  const boards = await getBoardsForUser(user.id)
  const activeBoard =
    boards.find((board) => board.id === params.board) ?? boards[0] ?? null

  return (
    <BoardWorkspace
      boards={boards}
      activeBoard={activeBoard}
      currentUserId={user.id}
      currentUserName={user.name}
    />
  )
}