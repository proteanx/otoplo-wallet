import './custom.scss';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ProSidebarProvider } from 'react-pro-sidebar';

ReactDOM.createRoot(document.getElementById('root'))
    .render(
        <ProSidebarProvider>
            <App />
        </ProSidebarProvider>
    );
