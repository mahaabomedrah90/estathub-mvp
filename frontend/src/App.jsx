import React from 'react'
import { Outlet } from 'react-router-dom'

export default function App() {
  return <Outlet />
}

 import Resources from "./pages/Resources.jsx";

<Route path="/resources" element={<Resources />} />
