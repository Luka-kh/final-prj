"use client"

import { useCallback, useEffect, useState } from "react"
import { UserMinus, UserPlus, X } from "lucide-react"
import {
  cancelBoardInvitation,
  inviteFriendToBoard,
  loadBoardSharing,
  removeBoardMember,
} from "@/actions/collaboration-actions"
import { Modal } from "@/components/ui/modal"
import type {
  BoardSharingOverview,
  BoardSharingFriend,
} from "@/types/collaboration"
import type { FriendUser } from "@/types/friend"

type BoardSharingModalProps = {
  boardId: string | null
  open: boolean
  onClose: () => void
}

export function BoardSharingModal({
  boardId,
  open,
  onClose,
}: BoardSharingModalProps) {
  const [overview, setOverview] =
    useState<BoardSharingOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const refreshOverview = useCallback(async () => {
    if (!boardId) {
      setOverview(null)
      return
    }

    setLoading(true)

    const result = await loadBoardSharing(boardId)

    if (result.success) {
      setOverview(result.overview)
    } else {
      setOverview(null)
      setError(result.message)
    }

    setLoading(false)
  }, [boardId])

  useEffect(() => {
    if (open) {
      setError("")
      setMessage("")
      void refreshOverview()
    }
  }, [open, refreshOverview])

  async function handleInvite(friendId: string) {
    if (!boardId) {
      return
    }

    setBusyId(friendId)
    setError("")
    setMessage("")

    const result = await inviteFriendToBoard(boardId, friendId)

    if (result.success) {
      setMessage(result.message ?? "Board invitation sent.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleCancel(
    invitationId: string,
    friendId: string,
  ) {
    setBusyId(friendId)
    setError("")
    setMessage("")

    const result = await cancelBoardInvitation(invitationId)

    if (result.success) {
      setMessage(result.message ?? "Board invitation canceled.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleRemove(memberId: string) {
    if (!boardId) {
      return
    }

    setBusyId(memberId)
    setError("")
    setMessage("")

    const result = await removeBoardMember(boardId, memberId)

    if (result.success) {
      setMessage(result.message ?? "Board member removed.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  const availableFriends =
    overview?.friends.filter((friend) => friend.status !== "MEMBER") ??
    []

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        <h2 className="text-lg font-bold text-(--text-primary)">
          Share Board
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-medium-grey">
          {overview
            ? `Invite friends to collaborate on “${overview.boardName}”.`
            : "Invite friends to collaborate on this board."}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red/10 px-4 py-3 text-xs font-bold text-red"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-4 rounded-md bg-purple/10 px-4 py-3 text-xs font-bold text-purple"
          >
            {message}
          </p>
        )}

        {loading ? (
          <EmptyMessage text="Loading board collaborators..." />
        ) : (
          <>
            <section className="mt-6">
              <SectionTitle
                title="Board Members"
                count={overview?.members.length ?? 0}
              />

              {!overview || overview.members.length === 0 ? (
                <EmptyMessage text="This board has no additional members." />
              ) : (
                <div className="space-y-2">
                  {overview.members.map((member) => (
                    <CollaboratorRow
                      key={member.id}
                      user={member}
                      action={
                        <button
                          type="button"
                          disabled={busyId === member.id}
                          onClick={() => handleRemove(member.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red/10 text-red transition hover:bg-red/20 disabled:cursor-wait disabled:opacity-60"
                          aria-label={`Remove ${member.name}`}
                        >
                          <UserMinus size={16} />
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6">
              <SectionTitle
                title="Invite Friends"
                count={availableFriends.length}
              />

              {!overview || availableFriends.length === 0 ? (
                <EmptyMessage text="There are no friends available to invite." />
              ) : (
                <div className="space-y-2">
                  {availableFriends.map((friend) => (
                    <CollaboratorRow
                      key={friend.id}
                      user={friend}
                      action={
                        <FriendInvitationAction
                          friend={friend}
                          busy={busyId === friend.id}
                          onInvite={() => handleInvite(friend.id)}
                          onCancel={() => {
                            if (friend.invitationId) {
                              void handleCancel(
                                friend.invitationId,
                                friend.id,
                              )
                            }
                          }}
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}

type FriendInvitationActionProps = {
  friend: BoardSharingFriend
  busy: boolean
  onInvite: () => void
  onCancel: () => void
}

function FriendInvitationAction({
  friend,
  busy,
  onInvite,
  onCancel,
}: FriendInvitationActionProps) {
  if (friend.status === "INVITED") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="flex items-center rounded-full bg-red/10 px-3 py-2 text-xs font-bold text-red transition hover:bg-red/20 disabled:cursor-wait disabled:opacity-60"
      >
        <X size={14} className="mr-1" />
        Cancel
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onInvite}
      className="flex items-center rounded-full bg-purple px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-hover disabled:cursor-wait disabled:opacity-60"
    >
      <UserPlus size={14} className="mr-1" />
      Invite
    </button>
  )
}

type CollaboratorRowProps = {
  user: FriendUser
  action: React.ReactNode
}

function CollaboratorRow({
  user,
  action,
}: CollaboratorRowProps) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-lg bg-(--page-background) p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple text-xs font-bold text-white">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-(--text-primary)">
          {user.name}
        </p>

        <p className="truncate text-xs font-medium text-medium-grey">
          {user.username ? `@${user.username}` : user.email}
        </p>
      </div>

      <div className="shrink-0">{action}</div>
    </div>
  )
}

function SectionTitle({
  title,
  count,
}: {
  title: string
  count: number
}) {
  return (
    <h3 className="mb-3 text-xs font-bold uppercase tracking-[2px] text-medium-grey">
      {title} ({count})
    </h3>
  )
}

function EmptyMessage({
  text,
}: {
  text: string
}) {
  return (
    <p className="mt-6 rounded-lg bg-(--page-background) px-4 py-4 text-xs font-medium text-medium-grey">
      {text}
    </p>
  )
}