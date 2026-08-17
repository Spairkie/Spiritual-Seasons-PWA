import { render } from 'preact';
import { App } from './app';
import './styles/main.css';

const root = document.getElementById('app');
if (!root) throw new Error('#app root element missing from index.html');
render(<App />, root);

// Splash screen (inlined in index.html) fades once the first paint lands.
requestAnimationFrame(() => {
  document.getElementById('splash')?.classList.add('fade-out');
});
