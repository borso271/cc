// src/core/constants.js
export const NS = 'http://www.w3.org/2000/svg';

// Geometry constants
export const K = 2 / Math.sqrt(3);      // SIDE / H
export const K_INV = Math.sqrt(3) / 2;  // H / SIDE
export const H_FROM_SIDE = (side) => side * Math.sqrt(3) / 2;

// Grid base configuration
export const BASE_SIDE = 50;
export const BASE_ROWS = 10;
export const BASE_COLS = 10;
export const MARGIN = 25;