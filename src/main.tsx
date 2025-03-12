import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FileProvider } from './context/FileContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <FileProvider>
            <App />
        </FileProvider>
    </React.StrictMode>,
);
