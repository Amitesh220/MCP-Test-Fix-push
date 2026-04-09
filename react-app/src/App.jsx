import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FormPage from './pages/FormPage.jsx'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setIsAuthenticated(true)
    setUser(userData)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Login onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/form"
          element={
            <FormPage
              user={user}
              isAuthenticated={isAuthenticated}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
