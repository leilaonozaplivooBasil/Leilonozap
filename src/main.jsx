import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Remove static skeleton once React takes over
const skeleton = document.getElementById('app-skeleton');
if (skeleton) skeleton.remove();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)