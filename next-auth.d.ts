import { DefaultSession, DefaultUser } from "next-auth"

/**
 * Module augmentation to extend NextAuth Session and User types with `id` and `role`.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string
      role: "admin" | "moderator" | "user"
    }
  }

  interface User extends DefaultUser {
    id: string
    role: "admin" | "moderator" | "user"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "admin" | "moderator" | "user"
  }
}
