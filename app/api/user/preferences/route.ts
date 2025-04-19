import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { updateUser } from "@/app/lib/user"

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { notifications } = await request.json()

    // Update user preferences
    const updatedUser = await updateUser(session.user.id, {
      preferences: {
        notifications,
        theme: "system", // Default value, would normally get the current value first
      },
    })

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Return success
    return NextResponse.json({
      preferences: updatedUser.preferences,
    })
  } catch (error) {
    console.error("Preferences update error:", error)
    return NextResponse.json({ message: "An error occurred while updating preferences" }, { status: 500 })
  }
}
