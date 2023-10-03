import './custom.scss';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { Provider } from 'react-redux';
import { store } from './store/store';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <Provider store={store}>
        <ProSidebarProvider>
            <App />
        </ProSidebarProvider>
    </Provider>
);
