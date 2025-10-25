import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import RootLayout from './layouts/RootLayout.jsx'
import Home from './pages/Home.jsx'
import Opportunities from './pages/Opportunities.jsx'
import PropertyDetail from './pages/PropertyDetail.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Login from './pages/Login.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'opportunities', element: <Opportunities /> },
      { path: 'properties/:id', element: <PropertyDetail /> },
      { path: 'wallet', element: <Portfolio /> },
      { path: 'login', element: <Login /> },
      // Admin page will be added later when wired
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
