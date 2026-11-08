import './style.css';
import { App } from './app';

const app = new App(document.getElementById('app')!);
// Debug handle for development (e.g. automated browser testing).
if (import.meta.env.DEV) (window as unknown as { optics: App }).optics = app;
