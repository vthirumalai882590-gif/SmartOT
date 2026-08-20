const key = process.env.GROQ_API_KEY || '';

async function testGroqConsultant() {
  if (!key) {
    console.log('Skipping Groq test: GROQ_API_KEY env var not set.');
    return;
  }
  const prompt = `Hospital Surgical Suite Telemetry Context:
- Active KPIs: OT Utilization: 72%, Active Surgeries: 2, Ready Patients: 4, Delayed Cases: 1, High-Risk Cases: 1, CSSD Availability: 88%
- Operating Theatres Status: [{"code":"OT-01","status":"SURGERY_STARTED"},{"code":"OT-02","status":"AVAILABLE"},{"code":"OT-03","status":"PREPARING","currentDelayMinutes":18,"riskLevel":"HIGH"},{"code":"OT-04","status":"TURNOVER"}]
- Active Operational Alerts: [{"id":"alt_01","severity":"CRITICAL","title":"Missing Surgical Consent: Arthur Pendelton (OT-03)"}]

User Operations Question: "Can we start OT-01 early or what is happening there?"

Provide your structured operational analysis JSON.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      })
    });
    const data = await response.json();
    console.log('STATUS:', response.status);
    console.log('RESPONSE:', data.choices?.[0]?.message?.content || data);
  } catch (err) {
    console.error('Groq test error:', err);
  }
}

testGroqConsultant();
