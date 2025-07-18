"use client";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

// export const metadata = {
//   title: "Thymus Alpha",
//   description: "Your Study Companion",
// };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
