import {createRoot} from 'react-dom/client';
import '@vidstack/react/player/styles/base.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
