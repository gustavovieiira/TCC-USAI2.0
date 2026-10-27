import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ConfiguracaoProvider } from './features/configuracao/ConfiguracaoContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfiguracaoProvider>
        <App />
      </ConfiguracaoProvider>
    </BrowserRouter>
  </StrictMode>,
);
