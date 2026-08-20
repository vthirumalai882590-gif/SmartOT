const key = process.env.GROQ_API_KEY || '';

async function testGroq() {
  if (!key) {
    console.log('Skipping Groq test: GROQ_API_KEY env var not set.');
    return;
  }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hello Groq, respond with {"status": "ok"}' }],
        temperature: 0.1
      })
    });
    const data = await response.json();
    console.log('Groq status:', response.status);
    console.log('Groq response:', data.choices?.[0]?.message?.content || data);
  } catch (err) {
    console.error('Groq test error:', err);
  }
}

testGroq();
