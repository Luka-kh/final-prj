"use client"

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  Check,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react"
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "@/actions/friend-actions"
import { loadFriendsOverview } from "@/actions/friend-overview-actions"
import { BoardInvitationsPanel } from "@/components/collaboration/board-invitations-panel"
import { Modal } from "@/components/ui/modal"
import type {
  FriendRelationship,
  FriendSearchResult,
  FriendsOverview,
  FriendUser,
} from "@/types/friend"

const emptyOverview: FriendsOverview = {
  friends: [],
  receivedRequests: [],
  sentRequests: [],
}

type FriendsModalProps = {
  open: boolean
  onClose: () => void
}

export function FriendsModal({
  open,
  onClose,
}: FriendsModalProps) {
  const [overview, setOverview] =
    useState<FriendsOverview>(emptyOverview)
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<
    FriendSearchResult[]
  >([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const refreshOverview = useCallback(async () => {
    setLoadingOverview(true)

    const result = await loadFriendsOverview()

    if (result.success) {
      setOverview(result.overview)
    } else {
      setError(result.message)
    }

    setLoadingOverview(false)
  }, [])

  useEffect(() => {
    if (open) {
      setError("")
      setMessage("")
      void refreshOverview()
    }
  }, [open, refreshOverview])

  function updateSearchRelationship(
    userId: string,
    relationship: FriendRelationship,
  ) {
    setSearchResults((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              relationship,
            }
          : user,
      ),
    )
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearching(true)
    setHasSearched(true)
    setError("")
    setMessage("")

    const result = await searchUsers(query)

    if (result.success) {
      setSearchResults(result.users)
    } else {
      setSearchResults([])
      setError(result.message)
    }

    setSearching(false)
  }

  async function handleSendRequest(userId: string) {
    setBusyId(userId)
    setError("")
    setMessage("")

    const result = await sendFriendRequest(userId)

    if (result.success) {
      updateSearchRelationship(userId, "REQUEST_SENT")
      setMessage(result.message ?? "Friend request sent.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleAcceptRequest(
    requestId: string,
    userId: string,
  ) {
    setBusyId(requestId)
    setError("")
    setMessage("")

    const result = await acceptFriendRequest(requestId)

    if (result.success) {
      updateSearchRelationship(userId, "FRIEND")
      setMessage(result.message ?? "Friend request accepted.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleRejectRequest(
    requestId: string,
    userId: string,
  ) {
    setBusyId(requestId)
    setError("")
    setMessage("")

    const result = await rejectFriendRequest(requestId)

    if (result.success) {
      updateSearchRelationship(userId, "NONE")
      setMessage(result.message ?? "Friend request rejected.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleCancelRequest(
    requestId: string,
    userId: string,
  ) {
    setBusyId(requestId)
    setError("")
    setMessage("")

    const result = await cancelFriendRequest(requestId)

    if (result.success) {
      updateSearchRelationship(userId, "NONE")
      setMessage(result.message ?? "Friend request canceled.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  async function handleRemoveFriend(userId: string) {
    setBusyId(userId)
    setError("")
    setMessage("")

    const result = await removeFriend(userId)

    if (result.success) {
      updateSearchRelationship(userId, "NONE")
      setMessage(result.message ?? "Friend removed.")
      await refreshOverview()
    } else {
      setError(result.message)
    }

    setBusyId("")
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto pr-1">
        <h2 className="text-lg font-bold text-(--text-primary)">
          Friends
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-medium-grey">
          Search for another account by username, name, or email.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-medium-grey"
            />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search accounts"
              className="h-10 w-full rounded-sm border border-(--border) bg-(--surface) pl-10 pr-3 text-sm font-medium text-(--text-primary) outline-none transition placeholder:text-medium-grey focus:border-purple"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className="h-10 rounded-full bg-purple px-5 text-sm font-bold text-white transition hover:bg-purple-hover disabled:cursor-wait disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

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

        {hasSearched && (
          <section className="mt-6">
            <SectionTitle
              title="Search Results"
              count={searchResults.length}
            />

            {searchResults.length === 0 ? (
              <EmptyMessage text="No matching accounts were found." />
            ) : (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    actions={
                      <SearchResultAction
                        user={user}
                        busy={busyId === user.id}
                        onSend={() => handleSendRequest(user.id)}
                      />
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <BoardInvitationsPanel active={open} />

        <section className="mt-6">
          <SectionTitle
            title="Received Requests"
            count={overview.receivedRequests.length}
          />

          {loadingOverview ? (
            <EmptyMessage text="Loading requests..." />
          ) : overview.receivedRequests.length === 0 ? (
            <EmptyMessage text="You have no received friend requests." />
          ) : (
            <div className="space-y-2">
              {overview.receivedRequests.map((request) => (
                <UserRow
                  key={request.id}
                  user={request.user}
                  actions={
                    <div className="flex gap-2">
                      <IconButton
                        label="Accept request"
                        disabled={busyId === request.id}
                        onClick={() =>
                          handleAcceptRequest(
                            request.id,
                            request.user.id,
                          )
                        }
                      >
                        <Check size={16} />
                      </IconButton>

                      <IconButton
                        label="Reject request"
                        danger
                        disabled={busyId === request.id}
                        onClick={() =>
                          handleRejectRequest(
                            request.id,
                            request.user.id,
                          )
                        }
                      >
                        <X size={16} />
                      </IconButton>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <SectionTitle
            title="Friends"
            count={overview.friends.length}
          />

          {loadingOverview ? (
            <EmptyMessage text="Loading friends..." />
          ) : overview.friends.length === 0 ? (
            <EmptyMessage text="You have not added any friends yet." />
          ) : (
            <div className="space-y-2">
              {overview.friends.map((friend) => (
                <UserRow
                  key={friend.id}
                  user={friend}
                  actions={
                    <IconButton
                      label="Remove friend"
                      danger
                      disabled={busyId === friend.id}
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      <UserMinus size={16} />
                    </IconButton>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <SectionTitle
            title="Sent Requests"
            count={overview.sentRequests.length}
          />

          {loadingOverview ? (
            <EmptyMessage text="Loading sent requests..." />
          ) : overview.sentRequests.length === 0 ? (
            <EmptyMessage text="You have no pending sent requests." />
          ) : (
            <div className="space-y-2">
              {overview.sentRequests.map((request) => (
                <UserRow
                  key={request.id}
                  user={request.user}
                  actions={
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() =>
                        handleCancelRequest(
                          request.id,
                          request.user.id,
                        )
                      }
                      className="rounded-full bg-red/10 px-3 py-2 text-xs font-bold text-red transition hover:bg-red/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}

type SearchResultActionProps = {
  user: FriendSearchResult
  busy: boolean
  onSend: () => void
}

function SearchResultAction({
  user,
  busy,
  onSend,
}: SearchResultActionProps) {
  if (user.relationship === "FRIEND") {
    return <RelationshipLabel text="Friends" />
  }

  if (user.relationship === "REQUEST_SENT") {
    return <RelationshipLabel text="Request sent" />
  }

  if (user.relationship === "REQUEST_RECEIVED") {
    return <RelationshipLabel text="Respond below" />
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onSend}
      className="flex items-center rounded-full bg-purple px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-hover disabled:cursor-wait disabled:opacity-60"
    >
      <UserPlus size={15} className="mr-1.5" />
      Add
    </button>
  )
}

type UserRowProps = {
  user: FriendUser
  actions: ReactNode
}

function UserRow({
  user,
  actions,
}: UserRowProps) {
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

      <div className="shrink-0">{actions}</div>
    </div>
  )
}

type SectionTitleProps = {
  title: string
  count: number
}

function SectionTitle({
  title,
  count,
}: SectionTitleProps) {
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
    <p className="rounded-lg bg-(--page-background) px-4 py-4 text-xs font-medium text-medium-grey">
      {text}
    </p>
  )
}

type IconButtonProps = {
  label: string
  danger?: boolean
  disabled: boolean
  onClick: () => void
  children: ReactNode
}

function IconButton({
  label,
  danger = false,
  disabled,
  onClick,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:cursor-wait disabled:opacity-60 ${
        danger
          ? "bg-red/10 text-red hover:bg-red/20"
          : "bg-purple/10 text-purple hover:bg-purple/20"
      }`}
    >
      {children}
    </button>
  )
}

function RelationshipLabel({
  text,
}: {
  text: string
}) {
  return (
    <span className="text-xs font-bold text-medium-grey">
      {text}
    </span>
  )
}