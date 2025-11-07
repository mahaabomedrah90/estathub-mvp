import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getToken, clearToken } from '../lib/api'

export default function Navbar() {
  const navigate = useNavigate()
  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-white font-semibold">Estathub</Link>
            <div className="ml-6 flex space-x-2">
              <NavLink to="/" className={linkClass} end>Home</NavLink>
              <NavLink to="/opportunities" className={linkClass}>Opportunities</NavLink>
              <NavLink to="/wallet" className={linkClass}>My Wallet</NavLink>
              <NavLink to="/blockchain" className={linkClass}>⛓️ Blockchain</NavLink>
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            </div>          </div>
          <div className="flex items-center space-x-2">
            {getToken() ? (
              <button
                onClick={() => { clearToken(); navigate('/'); }}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-white hover:bg-gray-600"
              >Logout</button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-white hover:bg-gray-600"
              >Login</button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
