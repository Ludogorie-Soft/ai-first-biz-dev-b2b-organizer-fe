import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#171717',
          borderRadius: 40,
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: '#FAFAFA',
            lineHeight: 1,
            letterSpacing: '-0.05em',
          }}
        >
          B
        </div>
        <svg width="72" height="56" viewBox="0 0 72 56" fill="none">
          <rect
            x="3"
            y="8"
            width="66"
            height="42"
            rx="6"
            stroke="#FAFAFA"
            strokeWidth="5.5"
          />
          <path
            d="M9 13 L36 32 L63 13"
            stroke="#FAFAFA"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
