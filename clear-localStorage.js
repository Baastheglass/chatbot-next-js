// Utility script to clear localStorage and reset to new default prompt
// Run this in browser console to reset the system prompt
localStorage.removeItem('openrouter_system_prompt');
console.log('System prompt cleared from localStorage. The app will now use the updated default prompt.');
