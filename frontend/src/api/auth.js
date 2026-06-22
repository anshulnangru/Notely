import client from './client'

export const authApi = {
    register: (data) => client.post('/auth/register', data).then(r => r.data),
    login: (data) => client.post('/auth/login', data).then(r => r.data),
    me: () => client.get('/auth/me').then(r => r.data),
    verifyEmail: (token) => client.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then(r => r.data),
    resendVerification: (email) => client.post(`/auth/resend-verification?email=${encodeURIComponent(email)}`).then(r => r.data),
    forgotPassword: (email) => client.post('/auth/forgot-password', { email }).then(r => r.data),
    resetPassword: (token, password) => client.post('/auth/reset-password', { token, password }).then(r => r.data),
}
