/**
 * Trillion AI Tech - Terminal Animation
 * Animated code/programming visualization
 */

(function() {
  'use strict';

  const terminalLines = [
    { text: 'initializing AI runtime...', type: 'command' },
    { text: '✓ loading agent architecture...', type: 'success' },
    { text: '✓ connecting services...', type: 'success' },
    { text: '✓ analyzing task...', type: 'success' },
    { text: '✓ execution pipeline ready', type: 'success' },
    { text: '_', type: 'cursor' }
  ];

  let currentLine = 0;
  const terminalOutput = document.getElementById('terminal-output');

  if (!terminalOutput) return;

  function typeLine(lineIndex) {
    if (lineIndex >= terminalLines.length) {
      // Reset after completing all lines
      setTimeout(() => {
        terminalOutput.innerHTML = '';
        currentLine = 0;
        typeLine(0);
      }, 3000);
      return;
    }

    const line = terminalLines[lineIndex];
    const lineEl = document.createElement('div');
    lineEl.className = 'terminal-line';

    if (line.type === 'command') {
      lineEl.innerHTML = `<span class="prompt">$</span> <span class="command">${line.text}</span>`;
    } else if (line.type === 'success') {
      lineEl.innerHTML = `<span class="success">✓</span> ${line.text}`;
    } else if (line.type === 'cursor') {
      lineEl.innerHTML = `<span class="prompt">$</span> <span class="cursor">${line.text}</span>`;
    }

    terminalOutput.appendChild(lineEl);
    currentLine++;

    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;

    // Type next line with delay
    const delay = line.type === 'cursor' ? 500 : 400 + Math.random() * 300;
    setTimeout(() => typeLine(currentLine), delay);
  }

  // Start animation
  setTimeout(() => typeLine(0), 500);
})();
