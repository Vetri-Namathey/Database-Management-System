import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // Use Vite proxy for backend integration
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't automatically redirect on 401 - let components handle it
    if (error.response?.status === 401 && window.location.pathname !== '/') {
      console.log('Unauthorized request, but letting component handle it');
    }
    return Promise.reject(error);
  }
);