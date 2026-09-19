export type FriendUser = {
  id: string
  name: string
  email: string
  username: string | null
  image: string | null
}

export type FriendRequestItem = {
  id: string
  user: FriendUser
}

export type FriendsOverview = {
  friends: FriendUser[]
  receivedRequests: FriendRequestItem[]
  sentRequests: FriendRequestItem[]
}

export type FriendRelationship =
  | "NONE"
  | "FRIEND"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"

export type FriendSearchResult = FriendUser & {
  relationship: FriendRelationship
}