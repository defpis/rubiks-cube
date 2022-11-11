// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.scss';

const element = document.querySelector('#root');

if (element) {
  const root = createRoot(element);
  root.render(
    // <StrictMode>
    <App />,
    // </StrictMode>,
  );
}
