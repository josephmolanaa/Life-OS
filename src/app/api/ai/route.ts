import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { messages, context } = await request.json();
  
  // FreeLLMAPI endpoint mock, replace with actual FreeLLMAPI endpoint/key
  const API_KEY = process.env.FREE_LLM_API_KEY; 
  if (!API_KEY) return NextResponse.json({ error: 'AI API Key not set' }, { status: 500 });

  // Example LLM request structure
  const response = await fetch('https://api.freellmapi.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `You are an AI assistant for a Personal Command Center (Life OS). Here is the project/user context: ${JSON.stringify(context)}. Use this to provide personalized insights.` },
        ...messages
      ]
    })
  });

  const data = await response.json();
  return NextResponse.json(data.choices[0].message);
}
