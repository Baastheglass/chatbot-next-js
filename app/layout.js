"use client";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

// export const metadata = {
//   title: "Thymus Alpha",
//   description: "Your Study Companion",
// };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
