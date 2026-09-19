"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import {
  acceptBoardInvitation,
  loadBoardInvitations,
  rejectBoardInvitation,
} from "@/actions/collaboration-actions"
import type {
  BoardInvitationItem,
  BoardInvitationsOverview,
} from "@/types/collaboration"

type BoardInvitationsPanelProps = {
  active: boolean
}

const emptyOverview: BoardInvitationsOverview = {
  invitations: [],
}

export function BoardInvitationsPanel({
  active,
}: BoardInvitationsPanelProps) {
  const router = useRouter()
  const [overview, setOverview] =
    useState<BoardInvitationsOverview>(emptyOverview)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const refreshInvitations = useCallback(async () => {
    setLoading(true)

    const result = await loadBoardInvitations()

    if (result.success) {
      setOverview(result.overview)
    } else {
      setError(result.message)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (active) {
      setError("")
      setMessage("")
      void refreshInvitations()
    }
  }, [active, refreshInvitations])

  async function handleAccept(invitation: BoardInvitationItem) {
    setBusyId(invitation.id)
    setError("")
    setMessage("")

    const result = await acceptBoardInvitation(invitation.id)

    if (result.success) {
      setMessage(result.message ?? "Board invitation accepted.")
      await refreshInvitations()
      router.refresh()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleReject(invitationId: string) {
    setBusyId(invitationId)
    setError("")
    setMessage("")

    const result = await rejectBoardInvitation(invitationId)

    if (result.success) {
      setMessage(result.message ?? "Board invitation rejected.")
      await refreshInvitations()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[2px] text-medium-grey">
        Board Invitations ({overview.invitations.length})
      </h3>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md bg-red/10 px-4 py-3 text-xs font-bold text-red"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mb-3 rounded-md bg-purple/10 px-4 py-3 text-xs font-bold text-purple"
        >
          {message}
        </p>
      )}

      {loading ? (
        <EmptyMessage text="Loading board invitations..." />
      ) : overview.invitations.length === 0 ? (
        <EmptyMessage text="You have no pending board invitations." />
      ) : (
        <div className="space-y-2">
          {overview.invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              busy={busyId === invitation.id}
              onAccept={() => handleAccept(invitation)}
              onReject={() => handleReject(invitation.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

type InvitationRowProps = {
  invitation: BoardInvitationItem
  busy: boolean
  onAccept: () => void
  onReject: () => void
}

function InvitationRow({
  invitation,
  busy,
  onAccept,
  onReject,
}: InvitationRowProps) {
  const initials = invitation.sender.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-lg bg-(--page-background) p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple text-xs font-bold text-white">
        {invitation.sender.image ? (
          <img
            src={invitation.sender.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-(--text-primary)">
          {invitation.board.name}
        </p>

        <p className="truncate text-xs font-medium text-medium-grey">
          Invited by{" "}
          {invitation.sender.username
            ? `@${invitation.sender.username}`
            : invitation.sender.name}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-purple/10 text-purple transition hover:bg-purple/20 disabled:cursor-wait disabled:opacity-60"
          aria-label={`Accept invitation to ${invitation.board.name}`}
        >
          <Check size={16} />
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red/10 text-red transition hover:bg-red/20 disabled:cursor-wait disabled:opacity-60"
          aria-label={`Reject invitation to ${invitation.board.name}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

function EmptyMessage({
  text,
}: {
  text: string
}) {
  return (
    <p className="rounded-lg bg-(--page-background) px-4 py-4 text-xs font-medium text-medium-grey">
      {text}
    </p>
  )
}