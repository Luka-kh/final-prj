"use server"

import { getFriendsOverview } from "@/lib/friends"
import { requireCurrentUser } from "@/lib/session"
import type { FriendsOverview } from "@/types/friend"

type FriendsOverviewResult =
  | {
      success: true
      overview: FriendsOverview
    }
  | {
      success: false
      message: string
    }

export async function loadFriendsOverview(): Promise<FriendsOverviewResult> {
  try {
    const currentUser = await requireCurrentUser()
    const overview = await getFriendsOverview(currentUser.id)

    return {
      success: true,
      overview,
    }
  } catch {
    return {
      success: false,
      message: "Your friends could not be loaded.",
    }
  }
}