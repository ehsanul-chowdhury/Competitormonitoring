import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="2.1" opacity="0.5" />
          <circle cx="16" cy="16" r="5.5" stroke="white" strokeWidth="2.1" />
          <circle cx="16" cy="16" r="2.4" fill="white" />
        </svg>
      </div>
    ),
    size
  )
}
