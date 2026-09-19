import type { FriendUser } from "@/types/friend"

export type BoardSharingStatus =
  | "AVAILABLE"
  | "INVITED"
  | "MEMBER"

export type BoardSharingFriend = FriendUser & {
  status: BoardSharingStatus
  invitationId: string | null
}

export type BoardSharingOverview = {
  boardId: string
  boardName: string
  members: FriendUser[]
  friends: BoardSharingFriend[]
}

export type BoardInvitationItem = {
  id: string
  board: {
    id: string
    name: string
  }
  sender: FriendUser
}

export type BoardInvitationsOverview = {
  invitations: BoardInvitationItem[]
}