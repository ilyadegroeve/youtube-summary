// content.js
console.log('Content script loaded');

const GEMINI_API_KEY = 'fill in your API key';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function getTranscript() {
    try {
        console.log('Starting transcript extraction...');
        
        // First try to find the transcript button in the menu
        const menuButtons = document.querySelectorAll('button.ytp-button');
        const moreButton = Array.from(menuButtons)
            .find(button => button.getAttribute('aria-label') === 'More actions');
            
        if (moreButton) {
            moreButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Look for the transcript button in multiple ways
        let transcriptButton = document.querySelector('[aria-label="Open transcript"]') ||
                             document.querySelector('button[title="Open transcript"]') ||
                             Array.from(document.querySelectorAll('button'))
                               .find(button => button.textContent.includes('Transcript'));

        if (!transcriptButton) {
            // Try finding it in the engagement panels
            const engagementPanels = document.querySelector('ytd-engagement-panel-section-list-renderer');
            if (engagementPanels) {
                const buttons = engagementPanels.querySelectorAll('button');
                transcriptButton = Array.from(buttons)
                    .find(button => button.textContent.toLowerCase().includes('transcript'));
            }
        }

        if (!transcriptButton) {
            throw new Error('Could not find transcript button. Please make sure the video has closed captions available.');
        }

        transcriptButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try multiple selectors for transcript text
        const transcriptSegments = document.querySelectorAll(
            'ytd-transcript-segment-renderer' + 
            ',ytd-transcript-segment-list-renderer' +
            ',ytd-transcript-body-renderer'
        );

        if (!transcriptSegments.length) {
            throw new Error('No transcript segments found after opening transcript panel');
        }

        // Extract text from segments
        let transcriptText = '';
        transcriptSegments.forEach(segment => {
            const textContent = segment.textContent.trim();
            if (textContent) {
                transcriptText += textContent + ' ';
            }
        });

        if (!transcriptText) {
            throw new Error('Transcript text extraction failed');
        }

        console.log('Transcript extracted successfully');
        return transcriptText.trim();
        
    } catch (error) {
        console.error('Error in getTranscript:', error);
        throw new Error('Failed to get transcript: ' + error.message);
    }
}

async function summarizeWithGemini(transcript) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Answer very short and concise. Speak in clear english. Write a very short summary of this YouTube video transcript by creating a dashed bullet list: ${transcript}`
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status}. ${errorText}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error in summarizeWithGemini:', error);
        throw error;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.action === 'summarize') {
        getTranscript()
            .then(transcript => summarizeWithGemini(transcript))
            .then(summary => {
                console.log('Summary generated successfully');
                sendResponse({ summary });
            })
            .catch(error => {
                console.error('Final error:', error);
                sendResponse({ 
                    summary: `Error: ${error.message}. Please make sure you're on a YouTube video page and the video has closed captions available.`
                });
            });
        return true;
    }
});