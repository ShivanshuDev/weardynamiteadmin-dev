import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_backend || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dynamite_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
