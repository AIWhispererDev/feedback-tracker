import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import { compare } from "bcryptjs"
import { getUserByEmail, createUser } from "@/app/lib/user"

export const authOptions = {
  // Ensure JWT/session signing uses a consistent secret
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('[AUTH DEBUG] credentials:', credentials)
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserByEmail(credentials.email)
        console.log('[AUTH DEBUG] user from DB:', user)
        if (!user) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)
        console.log('[AUTH DEBUG] isPasswordValid:', isPasswordValid)
        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile: async (profile: any) => {
        // Defensive: fallback if email is missing
        const email = profile.email ?? (profile.emails?.[0]?.value ?? null)
        if (!email) throw new Error("No email returned from OAuth provider")
        let user = await getUserByEmail(email)
        if (!user) {
          user = await createUser({
            name: profile.name || email.split("@")[0],
            email,
            password: 'oauth', // Mark as OAuth user
            image: profile.picture || undefined,
          })
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      profile: async (profile: any) => {
        // Defensive: fallback if email is missing
        const email = profile.email ?? (profile.emails?.[0]?.value ?? null)
        if (!email) throw new Error("No email returned from OAuth provider")
        let user = await getUserByEmail(email)
        if (!user) {
          user = await createUser({
            name: profile.name || profile.login || email.split("@")[0],
            email,
            password: 'oauth', // Mark as OAuth user
            image: profile.avatar_url || undefined,
          })
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any, user?: any }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: { session: any, token: any }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    newUser: "/auth/new-user",
  },
  session: {
    strategy: 'jwt' as const,
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
