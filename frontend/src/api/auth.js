import client from './client'

export const authApi = {
    register: (data) => client.post('/auth/register', data).then(r => r.data),
    login: (data) => client.post('/auth/login', data).then(r => r.data),
    me: () => client.get('/auth/me').then(r => r.data),
}
