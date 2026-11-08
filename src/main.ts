import './style.css';
import { App } from './app';
import { audio } from './audio/audio';

const app = new App(document.getElementById('app')!);
// Debug handle for development (e.g. automated browser testing).
if (import.meta.env.DEV) Object.assign(window, { optics: app, opticsAudio: audio });
