// src/main.js
import { initUI } from './modules/ui/ui-manager.js';
import { initGrid } from './modules/grid/index.js';
import { initGlobalEventListeners } from './event-handler.js';
import './store-subscriber.js'; // Import to activate the listener

// Initialize the application
initUI();
initGrid();
initGlobalEventListeners();

