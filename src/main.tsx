import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/global.scss';

const element = document.querySelector('#root');

if (element) {
  const root = createRoot(element);
  root.render(<App />);
}
