import { appState } from '../state.js';

const EXAMPLE = {
  rawSnippet: 'Erfahrener Finanzbuchhalter mit Fokus auf Abschlüsse HGB/IFRS, Prozessverbesserung und Teamarbeit. Zuverlässig, analytisch, hands-on.',
  recruiter: { name: 'Max Mustermann', email: 'max@example.com', phone: '+49 170 1234567' }
};

export function initInputForm(onGenerate){
  const form = document.getElementById('form-input');
  const snippet = document.getElementById('raw-snippet');
  const jobLocation = document.getElementById('job-location');
  const rName = document.getElementById('recruiter-name');
  const rEmail = document.getElementById('recruiter-email');
  const rPhone = document.getElementById('recruiter-phone');
  const keyInput = document.getElementById('openai-key');
  const modelSel = document.getElementById('model-select');
  const errBox = document.getElementById('input-errors');

  const savedRecruiter = JSON.parse(localStorage.getItem('pg_recruiter') || '{}');
  const savedJobLoc = localStorage.getItem('pg_job_location');
  const savedKey = localStorage.getItem('openai_api_key');
  const savedModel = localStorage.getItem('openai_model');
  if(savedKey){ keyInput.value = savedKey; }
  else { keyInput.value = ''; }
  rName.value = savedRecruiter.name || '';
  rEmail.value = savedRecruiter.email || '';
  rPhone.value = savedRecruiter.telefon || '';
  if(savedJobLoc){ jobLocation.value = savedJobLoc; }
  jobLocation.addEventListener('input', ()=> localStorage.setItem('pg_job_location', jobLocation.value || ''));
  if(savedModel){ modelSel.value = savedModel; }
  // If saved model is missing or invalid, default to gpt-5-mini
  if(!savedModel || !Array.from(modelSel.options).some(o => o.value === modelSel.value)){
    modelSel.value = 'gpt-5-mini';
  }
  // Fallback if saved model no longer exists in options
  if(modelSel && !Array.from(modelSel.options).some(o=> o.value === modelSel.value)){
    if(modelSel.options.length>0) modelSel.value = modelSel.options[0].value;
  }
  keyInput.addEventListener('change', ()=> localStorage.setItem('openai_api_key', keyInput.value || ''));
  const persistRecruiter = ()=> localStorage.setItem('pg_recruiter', JSON.stringify({ name:rName.value, email:rEmail.value, telefon:rPhone.value }));
  rName.addEventListener('input', persistRecruiter);
  rEmail.addEventListener('input', persistRecruiter);
  rPhone.addEventListener('input', persistRecruiter);
  modelSel.addEventListener('change', ()=> localStorage.setItem('openai_model', modelSel.value));

  // Beispiel laden entfernt

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    errBox.textContent = '';
    const recruiter = { name: rName.value.trim(), email: rEmail.value.trim(), telefon: rPhone.value.trim() };
    if(!recruiter.name || !recruiter.email || !recruiter.telefon){
      errBox.textContent = 'Bitte Kontaktdaten vollständig ausfüllen.';
      return;
    }
    const rawSnippet = snippet.value.trim();
    const jobLoc = jobLocation.value.trim();
    const openaiConfig = { apiKey: keyInput.value.trim(), model: modelSel.value };
    try{
      await onGenerate({ rawSnippet, recruiter, jobLocation: jobLoc, openaiConfig });
    }catch(err){
      errBox.textContent = err.userMessage || 'Unbekannter Fehler';
    }
  });
}


