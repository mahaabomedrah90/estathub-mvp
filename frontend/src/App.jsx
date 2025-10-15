import React, { useEffect, useState } from 'react'

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
      <p>Investor Transparency Dashboard (MVP)</p>

      <ul>
        {properties.map(p => (
          <li key={p.id}>
            <strong>{p.title}</strong> — Yield: {p.monthlyYield}% — Tokens: {p.tokensAvailable}
          </li>
        ))}
      </ul>
    </div>
  )
}
