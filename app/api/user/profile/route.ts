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

    const { name, image } = await request.json()

    // Validate input
    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    // Update user
    const updatedUser = await updateUser(session.user.id, {
      name,
      image,
    })

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Return success without exposing sensitive data
    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ message: "An error occurred while updating profile" }, { status: 500 })
  }
}
