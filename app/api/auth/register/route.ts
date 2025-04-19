import { NextResponse } from "next/server"
import { createUser, getUserByEmail } from "@/app/lib/user"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Create user
    const user = await createUser({
      name,
      email,
      password,
    })

    // Return success without exposing sensitive data
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "An error occurred during registration" }, { status: 500 })
  }
}
