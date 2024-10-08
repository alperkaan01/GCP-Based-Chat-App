import { createRoot } from 'react-dom/client'
import 'tailwindcss/tailwind.css'
import App from './App'

import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const container = document.getElementById('root') as HTMLDivElement
const root = createRoot(container)

root.render(
    <Provider store={store}>
      <App />
      <ToastContainer position="top-right" />
    </Provider>
)
