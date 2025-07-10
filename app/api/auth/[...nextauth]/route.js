import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import nodemailer from "nodemailer"
import crypto from "crypto"
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'; 
// Example whitelist
const EMAIL_WHITELIST = ["[email protected]", "[email protected]","mustafaahsan002@gmail.com", "lightningblazer123@gmail.com", ""]

// A small helper to hash user agent + a random string
function hashUserAgentAndRandom(userAgent) {
  const randomString = crypto.randomBytes(8).toString("hex")
  const combined = `${userAgent}::${randomString}`
  console.log('Frontend combined string:', combined)
  const hashed = crypto.createHash("sha256").update(combined).digest("hex")
  return { hashed, randomString }
}


function createToken(payload) {
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });
}
export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          console.log('Sending verification email to:', email);
          
          // Whitelist check
          // if (!EMAIL_WHITELIST.includes(email)) {
          //   throw new Error("Email is not whitelisted.")
          // }

          // Send magic link email
          const transporter = nodemailer.createTransport(provider.server)
          const result = await transporter.sendMail({
            to: email,
            from: provider.from,
            subject: "Your sign-in link",
            text: `Sign in using this link: ${url}`,
            html: `<p>Sign in using this link: <a href="${url}">${url}</a></p>`,
          })
          
          console.log('Email sent successfully:', result.messageId);
          
        } catch (error) {
          console.error("Email sending error:", error);
          throw new Error("Failed to send verification email: " + error.message);
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 1 week
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session, req }) {
      try {
        if (user) {
          console.log('JWT callback - user:', user);
          token.email = user.email;
          token.id = user.id;
          
          // Create a backend-compatible JWT token
          const backendPayload = {
            email: user.email,
            userId: user.id,
            sessionId: token.jti || crypto.randomUUID(),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
          };
          
          // Create the backend JWT
          token.backendToken = createToken(backendPayload);
          token.sessionId = backendPayload.sessionId;
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    
    async session({ session, token }) {
      try {
        if (token) {
          session.user.email = token.email;
          session.user.id = token.id;
          // Expose the backend JWT token to the session
          session.accessToken = token.backendToken;
          session.sessionId = token.sessionId;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
