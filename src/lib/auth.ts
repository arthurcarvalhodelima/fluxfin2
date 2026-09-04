import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      nome: string
      email: string
      papelSistema: string
      ativo: boolean
    }
  }

  interface User {
    id: string
    nome: string
    email: string
    papelSistema: string
    ativo: boolean
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    nome: string
    papelSistema: string
    ativo: boolean
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null
        }

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
        })

        if (!usuario) {
          return null
        }

        if (!usuario.ativo) {
          return null
        }

        const senhaValida = await bcrypt.compare(
          credentials.senha as string,
          usuario.senha
        )

        if (!senhaValida) {
          return null
        }

        return {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          papelSistema: usuario.papelSistema,
          ativo: usuario.ativo,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nome = user.nome
        token.papelSistema = user.papelSistema
        token.ativo = user.ativo
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.nome = token.nome as string
        session.user.papelSistema = token.papelSistema as string
        session.user.ativo = token.ativo as boolean
      }
      return session
    },
  },
})
