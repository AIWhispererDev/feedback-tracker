import { hash, hashSync } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { compare } from "bcryptjs"
import supabaseAdmin from "@/app/lib/supabaseClient"

const usersTable = "users"

export type UserRole = "admin" | "moderator" | "user"

export type User = {
  id: string
  name: string
  email: string
  password: string
  image?: string
  role: UserRole
  createdAt: number
  updatedAt: number
  preferences: {
    notifications: {
      email: boolean
      inApp: boolean
    }
    theme: "light" | "dark" | "system"
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from<User>(usersTable)
    .select("id,name,email,password,image,role")
    .eq("email", email)
    .single()
  if (error) {
    // If no user found, return null instead of throwing
    if (error.code === "PGRST116") return null
    throw error
  }
  return data
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from<User>(usersTable)
    .select("id,name,email,password,image,role")
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function createUser(userData: {
  name: string
  email: string
  password?: string | null
  image?: string
}): Promise<User> {
  // Ensure unique email in Supabase
  const { data: existingUser, error: findError } = await supabaseAdmin
    .from(usersTable)
    .select("email")
    .eq("email", userData.email)
    .single()
  if (findError && findError.code !== "PGRST116") throw findError
  if (existingUser) throw new Error("User with this email already exists")

  const hashedPassword = userData.password
    ? await hash(userData.password, 10)
    : ""

  // Insert without camelCase timestamps (use DB defaults)
  const insertPayload = {
    id: uuidv4(),
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    image: userData.image,
    role: "user",
    preferences: {
      notifications: { email: true, inApp: true },
      theme: "system",
    },
  }

  const { data, error: insertError } = await supabaseAdmin
    .from(usersTable)
    .insert(insertPayload)
    .select("id, name, email, image, role")
    .single()
  if (insertError) throw insertError
  return data as any
}

export async function updateUser(
  id: string,
  userData: Partial<Omit<User, "id" | "password" | "role" | "createdAt">>,
): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from<User>(usersTable)
    .update({ ...userData, updatedAt: Date.now() })
    .eq("id", id)
    .single()
  if (error) throw error
  return data
}

export async function updateUserPassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const user = await getUserById(id)
  if (!user) return false

  // Verify current password
  const isPasswordValid = await compare(currentPassword, user.password)
  if (!isPasswordValid) return false

  // Hash new password
  const hashedPassword = await hash(newPassword, 10)

  const { error } = await supabaseAdmin
    .from<User>(usersTable)
    .update({ password: hashedPassword, updatedAt: Date.now() })
    .eq("id", id)
  if (error) throw error

  return true
}

export async function getUserFeedback(userId: string) {
  // This would query the feedback table for items submitted by this user
  // For now, we'll return a mock implementation
  return []
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseAdmin
    .from<User>(usersTable)
    .select("*")
  if (error) throw error
  return data
}

export async function updateUserRole(id: string, role: UserRole): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from(usersTable)
    .update({ role, updated_at: new Date() })
    .eq("id", id)
    .select("id,name,email,image,role")
    .single()
  if (error) throw error
  return data
}
