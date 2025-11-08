import React, { useEffect, useState } from 'react'
import Portfolio from './pages/investor/Portfolio'

export default function App() {
  const [properties, setProperties] = useState([])

  useEffect(() => {
    fetch(import.meta.env.VITE_API_BASE + '/api/properties')
      .then(r => r.json())
      .then(data => setProperties(data))
      .catch(() => setProperties([]))
  }, [])

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Estathub MVP</h1>
      <h2>Properties</h2>

      <ul>
        {properties.map(p => (
          <li key={p.id}>
            <strong>{p.name ?? p.title}</strong> — Tokens remaining: {p.remainingTokens ?? p.tokensAvailable}
          </li>
        ))}
      </ul>

      <hr style={{ margin: '24px 0' }} />
      <h2>My Wallet</h2>
      <Portfolio />
    </div>
  )
}
