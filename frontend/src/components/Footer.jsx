import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t mt-8">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-500">
        © {new Date().getFullYear()} Estathub. All rights reserved.
      </div>
    </footer>
  )
}
