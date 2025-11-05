import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeModeScript } from 'flowbite-react';
import AppWithAuth from './AppWithAuth';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeModeScript />
    <AppWithAuth />
  </React.StrictMode>
);
