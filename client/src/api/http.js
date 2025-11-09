// src/api/http.js
import axios from 'axios';

// Use Vite proxy or env URL
export const http = axios.create({
  baseURL: import.meta.env.VITE_BASEURL|| '/',
  withCredentials: true,
});
