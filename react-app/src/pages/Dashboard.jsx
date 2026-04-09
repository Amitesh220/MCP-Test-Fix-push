import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { mockApi } from '../api/mockApi.js'

export default function Dashboard({ user, isAuthenticated, onLogout }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await mockApi.getStats()
        // Accessing the correct stats data
        setStats(response.data.result)
      } catch (err) {
        console.error('Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#sidebar-logo)" />
            <path d="M12 20L18 14L26 22L20 28L12 20Z" fill="white" fillOpacity="0.9" />
            <path d="M18 14L26 22L30 18L22 10L18 14Z" fill="white" fillOpacity="0.6" />
            <defs>
              <linearGradient id="sidebar-logo" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="sidebar-title">Nexus</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item active" id="nav-dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
          <Link to="/form" className="nav-item" id="nav-form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            New Submission
          </Link>
          <a href="#" className="nav-item" id="nav-analytics">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Analytics
          </a>
          <a href="#" className="nav-item" id="nav-settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0) || '?'}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Unknown User'}</span>
            <span className="user-role">{user?.role || 'No Role'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} id="logout-btn" title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-heading">Dashboard</h1>
            <p className="dashboard-greeting">
              Welcome back, {user?.name || 'User'}! Here is your overview for today.
            </p>
            <p>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </header>

        {loading ? (
          <div className="loading-container">
            <div className="loading-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
            </div>
            <p className="loading-text">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card stat-card-purple">
                <div className="stat-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="stat-card-content">
                  <span className="stat-label">Total Users</span>
                  <span className="stat-value">{stats?.totalUsers?.toLocaleString() || '—'}</span>
                  <span className="stat-change positive">+12.5%</span>
                </div>
              </div>

              <div className="stat-card stat-card-blue">
                <div className="stat-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="stat-card-content">
                  <span className="stat-label">Active Projects</span>
                  <span className="stat-value">{stats?.activeProjects || '—'}</span>
                  <span className="stat-change positive">+3 new</span>
                </div>
              </div>

              <div className="stat-card stat-card-green">
                <div className="stat-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="stat-card-content">
                  <span className="stat-label">Revenue</span>
                  <span className="stat-value">
                    ${stats?.revenue?.toLocaleString() || '—'}
                  </span>
                  <span className="stat-change positive">+8.2%</span>
                </div>
              </div>

              <div className="stat-card stat-card-orange">
                <div className="stat-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="stat-card-content">
                  <span className="stat-label">Conversion Rate</span>
                  <span className="stat-value">{stats?.conversionRate || '—'}%</span>
                  <span className="stat-change negative">-2.1%</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <section className="activity-section">
              <div className="section-header">
                <h2>Recent Activity</h2>
                <button className="view-all-btn" id="view-all-btn">View all</button>
              </div>
              <div className="activity-list">
                {stats?.recentActivity ? (
                  stats.recentActivity.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-dot"></div>
                      <div className="activity-content">
                        <span className="activity-action">{item.action}</span>
                        <span className="activity-user">{item.user}</span>
                      </div>
                      <span className="activity-time">{item.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                      <circle cx="12" cy="12" r="10" />
                      <line x="12" y="8" x="12" y="12" />
                      <line x="12" y="16" x="12.01" y="16" />
                    </svg>
                    <p>No recent activity to display</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}