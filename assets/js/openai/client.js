import { PROFILE_SCHEMA, SYSTEM_PROMPT, userPrompt } from '../schema/schema.js';

function buildResponseFormat(){
  return {
    type: 'json_schema',
    json_schema: PROFILE_SCHEMA
  };
}

function buildMessages(rawSnippet, recruiter){
  return [
    { role: 'system', content: [ { type:'input_text', text: SYSTEM_PROMPT } ] },
    { role: 'user', content: [ { type:'input_text', text: userPrompt(rawSnippet, recruiter) } ] }
  ];
}

export async function generateProfile(rawSnippet, recruiter, { apiKey, model }){
  if(!apiKey) throw Object.assign(new Error('API-Schlüssel fehlt'), { userMessage: 'Bitte OpenAI API‑Schlüssel angeben.' });
  const url = 'https://api.openai.com/v1/responses';
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const inputMsgs = buildMessages(rawSnippet, recruiter);
  const body = {
    model: model || 'gpt-5-mini',
    input: inputMsgs,
    reasoning: {
      effort: 'high'
    },
    text: {
      format: {
        type: 'json_schema',
        strict: true,
        name: PROFILE_SCHEMA.name,
        schema: PROFILE_SCHEMA.schema
      }
    }
  };
  // Debug logging (no API key)
  try{
    console.groupCollapsed('[LLM] OpenAI request');
    console.log('model:', body.model);
    try{
      const sys = inputMsgs?.[0]?.content?.[0]?.text || '';
      const usr = inputMsgs?.[1]?.content?.[0]?.text || '';
      const trunc = (s, n=400)=> String(s).length>n ? String(s).slice(0,n)+'…' : String(s);
      console.log('system:', trunc(sys));
      console.log('user:', trunc(usr));
    }catch(_){ /* ignore */ }
    console.log('schema.name:', PROFILE_SCHEMA.name);
    console.groupEnd();
  }catch(_){ /* ignore */ }

  const t0 = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
  const res = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  if(!res.ok){
    const txt = await res.text().catch(()=> '');
    try{ console.error('[LLM] HTTP error', res.status, txt?.slice ? txt.slice(0,1000) : txt); }catch(_){/* noop */}
    throw Object.assign(new Error('OpenAI Fehler'), { userMessage: `OpenAI Fehler: ${res.status} ${txt}` });
  }
  const json = await res.json();
  try{
    const t1 = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();
    console.groupCollapsed('[LLM] OpenAI response');
    console.log('elapsed_ms:', Math.round(t1 - t0));
    console.log('raw.output.length:', Array.isArray(json?.output) ? json.output.length : 'n/a');
    console.groupEnd();
  }catch(_){ /* ignore */ }
  const refusal = extractRefusal(json);
  if(refusal){
    try{ console.warn('[LLM] refusal:', refusal); }catch(_){/* noop */}
    throw Object.assign(new Error('Modell verweigert'), { userMessage: `Modell verweigert: ${refusal}` });
  }
  // Responses API structured outputs: find output_text or structured object
  // In structured outputs, the model returns parsed JSON per schema under output[0].content[0].text or similar.
  // Try to find first JSON object in the response.
  const data = extractFirstJson(json);
  if(!data){
    throw Object.assign(new Error('Parsing fehlgeschlagen'), { userMessage: 'Strukturierte Antwort konnte nicht gelesen werden.' });
  }
  try{
    console.groupCollapsed('[LLM] Parsed structured data');
    const preview = JSON.stringify(data).slice(0,1200);
    console.log(preview + (JSON.stringify(data).length>1200 ? '…' : ''));
    console.groupEnd();
  }catch(_){ /* ignore */ }
  // Enforce anonymization guardrails if needed
  if(data.person_data){
    data.person_data.name = '[Anonymisiert]';
    // Enforce fixed fields per requirements
    data.person_data.staatsangehoerigkeit = 'deutsch';
    data.person_data.familienstand = 'ledig';
  }
  return data;
}

function extractFirstJson(resp){
  // Prefer walking all outputs/content to find parsed JSON or JSON string
  try{
    const outputs = Array.isArray(resp?.output) ? resp.output : (Array.isArray(resp?.outputs) ? resp.outputs : []);
    for(const item of outputs){
      const contents = Array.isArray(item?.content) ? item.content : (Array.isArray(item?.contents) ? item.contents : []);
      for(const c of contents){
        // Structured outputs sometimes provide c.parsed
        if(c && c.parsed && typeof c.parsed === 'object'){
          try{ console.debug('[LLM] parse: using content.parsed'); }catch(_){/* noop */}
          return c.parsed;
        }
        // Otherwise try c.text if it looks like JSON
        if(typeof c?.text === 'string'){
          const trimmed = c.text.trim();
          if(trimmed.startsWith('{') || trimmed.startsWith('[')){
            const parsed = safeParseJson(trimmed);
            if(parsed && typeof parsed === 'object'){
              try{ console.debug('[LLM] parse: using content.text JSON'); }catch(_){/* noop */}
              return parsed;
            }
          }
        }
        // Some SDKs may use value/content
        const alt = c && (c.value || c.content);
        if(alt && typeof alt === 'object'){
          try{ console.debug('[LLM] parse: using content.value/content'); }catch(_){/* noop */}
          return alt;
        }
      }
    }
  }catch(_){/* ignore */}

  // As a last resort, try to find the first JSON object inside any text fields
  try{
    const outputs = Array.isArray(resp?.output) ? resp.output : [];
    for(const item of outputs){
      const contents = Array.isArray(item?.content) ? item.content : [];
      for(const c of contents){
        if(typeof c?.text === 'string'){
          const t = c.text;
          const m = t.match(/\{[\s\S]*\}/);
          if(m){
            const maybe = safeParseJson(m[0]);
            if(maybe && typeof maybe === 'object'){
              try{ console.debug('[LLM] parse: regex JSON from text'); }catch(_){/* noop */}
              return maybe;
            }
          }
        }
      }
    }
  }catch(_){/* ignore */}

  return null;
}

function safeParseJson(s){
  try{ return JSON.parse(s); }catch{ return null; }
}

function extractRefusal(resp){
  try{
    const output = resp.output || resp.outputs || [];
    for(const item of output){
      const content = item.content || [];
      for(const c of content){
        if(c.refusal) return typeof c.refusal === 'string' ? c.refusal : JSON.stringify(c.refusal);
        if(c.type === 'refusal' && c.text) return c.text;
      }
    }
  }catch(_){/* noop */}
  return null;
}


