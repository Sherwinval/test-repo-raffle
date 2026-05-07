// Team convention: bootstrap only. Do not place UI/business logic in this file.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
