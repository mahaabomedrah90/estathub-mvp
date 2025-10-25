import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Estathub – Tokenized Real Estate (MVP)</h1>
      <p className="text-gray-600">Invest in fractional real estate with local payment options and monthly ROI.</p>
      <div>
        <Link to="/opportunities" className="inline-block rounded bg-gray-900 text-white px-4 py-2">Explore Opportunities</Link>
      </div>
    </div>
  )
}
