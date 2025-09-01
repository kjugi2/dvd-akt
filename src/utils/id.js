// src/utils/id.js
export const makeId = (len = 12) =>
  Math.random().toString(36).slice(2, 2 + len) + Date.now().toString(36);
