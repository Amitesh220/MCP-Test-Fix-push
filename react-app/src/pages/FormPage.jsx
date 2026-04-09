import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockApi } from '../api/mockApi.js'

export default function FormPage({ user, isAuthenticated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium',
  })
  const [submissions, setSubmissions] = useState([])
  const [submitStatus, setSubmitStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      const response = await mockApi.getSubmissions()
      // Accessing the correct submissions data
      const data = response.data.result.submissions
      if (data) {
        setSubmissions(data)
      }
    } catch (err) {
      console.error('Failed to load submissions')
    }
  }

  // Updated email validation with proper regex
  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid email is required'
    if (!formData.subject.trim()) return 'Subject is required'
    if (!formData.message.trim()) return 'Message is required'
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setSubmitStatus({ type: 'error', message: validationError })
      return
    }

    setLoading(true)
    setSubmitStatus(null)

    try {
      const response = await mockApi.submitForm(formData)
      // Accesses the correct success status
      if (response.data.result.success) {
        setSubmitStatus({ type: 'success', message: 'Submission sent successfully!' })
      } else {
        setSubmitStatus({ type: 'success', message: 'Submitted! (unconfirmed)' })
      }

      // Correctly echo back the submitted data
      const newEntry = response.data.result.submittedData || {}
      setSubmissions((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...newEntry,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
        },
      ])

      // Reset form data after submission
      setFormData({ name: '', email: '', subject: '', message: '', priority: 'medium' })
    } catch (err) {
      setSubmitStatus({ type: 'error', message: 'Submission failed. Try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      {/* Sidebar (minimal) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#form-logo)" />
            <path d="M12 20L18 14L26 22L20 28L12 20Z" fill="white" fillOpacity="0.9" />
            <path d="M18 14L26 22L30 18L22 10L18 14Z" fill="white" fillOpacity="0.6" />
            <defs>
              <linearGradient id="form-logo" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="sidebar-title">Nexus</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item" id="nav-back-dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
          <a href="#" className="nav-item active" id="nav-form-active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            New Submission
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0) || '?'}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || 'Unknown User'}</span>
            <span className="user-role">{user?.role || 'No Role'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="form-main">
        <header className="form-header">
          <h1>New Submission</h1>
          <p className="form-header-sub">Create a new contact submission entry</p>
        </header>

        <div className="form-layout">
          {/* Form Card */}
          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form-name" className="form-label">Full Name</label>
                  <input
                    id="form-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="form-email" className="form-label">Email Address</label>
                  <input
                    id="form-email"
                    name="email"
                    type="text"
                    className="form-input"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="form-subject" className="form-label">Subject</label>
                  <input
                    id="form-subject"
                    name="subject"
                    type="text"
                    className="form-input"
                    placeholder="Partnership Inquiry"
                    value={formData.subject}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="form-priority" className="form-label">Priority</label>
                  <select
                    id="form-priority"
                    name="priority"
                    className="form-input form-select"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="form-message" className="form-label">Message</label>
                <textarea
                  id="form-message"
                  name="message"
                  className="form-input form-textarea"
                  placeholder="Describe your inquiry in detail..."
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              {submitStatus && (
                <div className={`form-status ${submitStatus.type}`}> 
                  {submitStatus.type === 'success' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                  {submitStatus.message}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}> 
                  Cancel
                </button>
                <button
                  id="submit-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner"></span>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Entry'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Submissions List */}
          <div className="submissions-card">
            <div className="section-header">
              <h2>Recent Submissions</h2>
              <span className="submission-count">{submissions.length} entries</span>
            </div>
            <div className="submissions-list">
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <div key={sub.id} className="submission-item">
                    <div className="submission-header">
                      <span className="submission-name">{sub.name || 'No Name'}</span>
                      <span className={`submission-status ${sub.status}`}>{sub.status || 'unknown'}</span>
                    </div>
                    <span className="submission-subject">{sub.subject || 'No Subject'}</span>
                    <div className="submission-meta">
                      <span>{sub.email || 'No Email'}</span>
                      <span>{sub.date}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p>No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}