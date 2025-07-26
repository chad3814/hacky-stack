import type { NextAuthConfig } from 'next-auth'
import GitHub from "next-auth/providers/github"

const AUTHORIZED_EMAILS: string[] = [
  // Add specific email addresses here
  'chad@cwalker.dev'
]

const AUTHORIZED_DOMAINS: string[] = [
]

function isAuthorizedEmail(email: string): boolean {
  // Check if email is in the authorized list
  if (AUTHORIZED_EMAILS.includes(email)) {
    return true
  }

  // Check if email domain is authorized
  const domain = email.split('@')[1]
  return AUTHORIZED_DOMAINS.includes(domain)
}

export default {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        console.log('Sign-in attempt without email:', user)
        return false
      }

      if (!isAuthorizedEmail(user.email)) {
        console.log(`Unauthorized sign-in attempt: ${user.email}`)
        return false
      }

      return true
    },
    async session({ session, user }) {
      // With database sessions, we get the user from the database
      if (session.user?.email && !isAuthorizedEmail(session.user.email)) {
        throw new Error('Unauthorized')
      }

      // Add user id to session
      if (user?.id) {
        session.user.id = user.id
      }

      return session
    },
    async jwt({ token, user }) {
      // This callback is used for JWT compatibility in middleware
      if (user?.email && !isAuthorizedEmail(user.email)) {
        throw new Error('Unauthorized')
      }
      
      if (user) {
        token.id = user.id
      }
      
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
} satisfies NextAuthConfig
