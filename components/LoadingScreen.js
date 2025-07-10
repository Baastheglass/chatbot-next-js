"use client";

export default function LoadingScreen() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#111",
      color: "#fff",
      flexDirection: "column"
    }}>
      <h2>Loading...</h2>
      <p>Please wait</p>
    </div>
  );
}
