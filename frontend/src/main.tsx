import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import AdminApp from './AdminApp';

const isAdminRoute = /^\/admin(?:\/cardapio|\/unidades)?$/.test(window.location.pathname.replace(/\/+$/, ''));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminApp /> : <App />}
  </React.StrictMode>,
);
