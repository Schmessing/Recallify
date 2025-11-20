import { GoogleGenAI } from '@google/genai';
import React, { useState } from 'react';

// For testing purposes only. This key is exposed to users in the browser.
// In production, use a secure backend.
const API_KEY = 'AIzaSyA3tBRyfZuYH33JJVmJleoRkiBR1u5Q3gQ'; 

function GeminiChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize the client correctly with an object containing the apiKey property
  const genAI = new GoogleGenAI({ apiKey: API_KEY });

  const generateContent = async () => {
    setLoading(true);
    setResponse('');
    try {
      // FIX: Access the generateContent method through the 'models' service
      const result = await genAI.models.generateContent({
        model: 'gemini-2.5-flash', // Specify the model here
        contents: prompt, // Pass the prompt text
      });

      // The response object is structured differently; access the text directly
      const text = result.text;
      console.log(text);
    } catch (error) {
      console.error('Error generating content:', error);
      setResponse(`Error: ${error.message}`); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Gemini AI Chat</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        rows="5"
        cols="50"
      />
      <br />
      <button onClick={generateContent} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Response'}
      </button>
      {response && (
        <div>
          <h2>Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default GeminiChat;