import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FONT_FACE_CSS } from './font';
import './styles.css';

// FR-48：Inter @font-face 单源注入（编辑器与出码同源同字体）
const fontFace = document.createElement('style');
fontFace.textContent = FONT_FACE_CSS;
document.head.appendChild(fontFace);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
