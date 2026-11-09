import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import AdminApp from './AdminApp';

const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminApp /> : <App />}
  </React.StrictMode>,
);
