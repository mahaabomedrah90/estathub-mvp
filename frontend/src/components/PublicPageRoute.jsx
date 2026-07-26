import React from 'react'
import { Navigate } from 'react-router-dom'
import { usePublicPageVisibility } from '../hooks/usePublicPageVisibility'

export default function PublicPageRoute({ setting, children }) {
  const visibility = usePublicPageVisibility()

  if (visibility.loading) return null
  if (!visibility[setting]) return <Navigate to="/" replace />

  return children
}
