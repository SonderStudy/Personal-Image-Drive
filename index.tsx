
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log('🚀 LuminaDrive: Starting application...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ LuminaDrive: Could not find root element '#root'");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ LuminaDrive: React root mounted successfully');
  } catch (err) {
    console.error('❌ LuminaDrive: Rendering error:', err);
    rootElement.innerHTML = `<div style="padding: 20px; color: #ef4444;">Render Error: ${err.message}</div>`;
  }
}
