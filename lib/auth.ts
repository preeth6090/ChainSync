import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Nodemailer from 'next-auth/providers/nodemailer';
import { prisma } from '@/lib/prisma';

// Database session strategy (not JWT): the Session/Account/VerificationToken tables already
// exist in schema.prisma for exactly this. That trades a DB read per request for the ability
// to revoke a session server-side — the right default for admin/procurement/finance roles.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  providers: [
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    // isActive exists specifically so an admin can deactivate a compromised or offboarded
    // account — without this check that flag would be purely decorative, since a
    // deactivated user could still complete the magic-link flow and get a valid session.
    async signIn({ user }) {
      if (!user.id) return true;
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true } });
      return dbUser?.isActive ?? true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as typeof user & { role: import('@prisma/client').UserRole }).role;
      return session;
    },
  },
});
