import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeModeScript } from 'flowbite-react';
import AppWithAuth from './AppWithAuth';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeModeScript />
      <AppWithAuth />
    </BrowserRouter>
  </React.StrictMode>
);
