import 'regenerator-runtime/runtime';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { VoiceProvider } from './context/VoiceContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </BrowserRouter>
  </StrictMode>,
)
