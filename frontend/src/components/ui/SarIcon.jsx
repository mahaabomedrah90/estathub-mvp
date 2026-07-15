import React from 'react'

export default function SarIcon({ size = 16, className = '' }) {
  return (
    <span
      className={className}
      style={{ fontSize: size, fontWeight: 600, lineHeight: 1 }}
      aria-label="SAR"
    >
      ﷼
    </span>
  )
}
