// popup.js
document.getElementById('summarize').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const summary = document.getElementById('summary');
  
  summary.textContent = 'Loading...';
  summary.className = 'loading';

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'summarize' });
    summary.textContent = response.summary;
    summary.className = '';
  } catch (error) {
    summary.textContent = 'Error: Could not generate summary. Make sure you are on a YouTube video page.';
    summary.className = '';
  }
});
