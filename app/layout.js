"use client";
import "./globals.css";

// export const metadata = {
//   title: "Thymus Alpha",
//   description: "Your Study Companion",
// };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
