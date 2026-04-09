// Mock API service with intentional bugs

export const mockApi = {
  login: (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          resolve({
            data: {
              result: {
                user: {
                  id: 1,
                  name: 'Alex Morgan',
                  email: email,
                  role: 'Admin',
                  avatar: null,
                },
                token: 'mock-jwt-token-xyz123',
              },
            },
            status: 200,
          })
        } else {
          reject({
            data: { message: 'Invalid credentials' },
            status: 401,
          })
        }
      }, 800)
    })
  },

  getStats: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            result: {
              totalUsers: 2847,
              activeProjects: 34,
              revenue: 128450,
              conversionRate: 68.4,
              recentActivity: [
                { id: 1, action: 'New signup', user: 'Sarah Chen', time: '2 min ago' },
                { id: 2, action: 'Purchase completed', user: 'Mike Johnson', time: '5 min ago' },
                { id: 3, action: 'Support ticket', user: 'Emily Davis', time: '12 min ago' },
                { id: 4, action: 'Project created', user: 'Tom Wilson', time: '18 min ago' },
                { id: 5, action: 'Invoice paid', user: 'Lisa Park', time: '25 min ago' },
              ],
            },
          },
          status: 200,
        })
      }, 600)
    })
  },

  submitForm: (formData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            result: {
              success: true,
              message: 'Submission received',
              submittedData: formData,
            },
          },
          status: 200,
        })
      }, 1000)
    })
  },

  getSubmissions: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            result: {
              submissions: [
                {
                  id: 1,
                  name: 'John Smith',
                  email: 'john@example.com',
                  subject: 'Partnership Inquiry',
                  message: 'Interested in discussing potential partnership...',
                  date: '2026-04-08',
                  status: 'pending',
                },
                {
                  id: 2,
                  name: 'Anna Lee',
                  email: 'anna@corp.io',
                  subject: 'Product Demo',
                  message: 'Would like to schedule a product demonstration...',
                  date: '2026-04-07',
                  status: 'reviewed',
                },
              ],
            },
          },
          status: 200,
        })
      }, 500)
    })
  },
}
