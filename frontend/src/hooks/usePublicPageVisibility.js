import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

const DEFAULT_VISIBILITY = {
  aboutPageEnabled: false,
  opportunitiesPageEnabled: false,
}

export function usePublicPageVisibility() {
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    fetchJson('/api/settings/public')
      .then((response) => {
        if (!active) return
        setVisibility({
          aboutPageEnabled: response?.data?.aboutPageEnabled === true,
          opportunitiesPageEnabled: response?.data?.opportunitiesPageEnabled === true,
        })
      })
      .catch(() => {
        if (active) setVisibility(DEFAULT_VISIBILITY)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { ...visibility, loading }
}
