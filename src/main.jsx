import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store from '../src/Redux/store' // Import your Redux store
import './index.css'
import App from './App.jsx'
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function(locale = 'fr-FR', options) {
  if (locale === 'fr-FR' || locale === 'fr') {
    const day = String(this.getDate()).padStart(2, '0');
    const month = String(this.getMonth() + 1).padStart(2, '0');
    const year = this.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return originalToLocaleDateString.call(this, locale, options);
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)