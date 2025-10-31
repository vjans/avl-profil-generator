// Lightweight validator mirroring key constraints; returns { valid, messages }.

function push(msgs, key, text){ if(!msgs[key]) msgs[key] = []; msgs[key].push(text); }

export function validateProfile(p){
  const messages = {};
  let valid = true;
  if(!p){ return { valid:false, messages:{ root:['Profil fehlt'] } }; }

  // Required top-level keys
  const requiredTop = ['meta','person_data','kontaktdaten','rahmenbedingungen','berufsziel','kenntnisse_und_faehigkeiten','beruflicher_werdegang','akademische_laufbahn'];
  for(const k of requiredTop){ if(!(k in p)){ valid=false; push(messages, k, 'Fehlend'); } }

  // meta
  if(p.meta){
    if(!('profil_id' in p.meta)) { valid=false; push(messages,'meta','Profil-ID fehlt'); }
    if(!('standort_stellenangebot' in p.meta)) { valid=false; push(messages,'meta','Standort Stellenangebot fehlt'); }
  }

  // person_data
  if(p.person_data){
    if(p.person_data.name !== '[Anonymisiert]') { valid=false; push(messages,'person_data','Name muss [Anonymisiert] sein'); }
    const req = ['name','geburtsjahr','wohnort','familienstand','staatsangehoerigkeit'];
    for(const k of req){ if(!(k in p.person_data)) { valid=false; push(messages,'person_data',`Feld fehlt: ${k}`); } }
  }

  // kontaktdaten
  if(p.kontaktdaten){
    const req = ['name','email','telefon'];
    for(const k of req){ if(!p.kontaktdaten[k]){ valid=false; push(messages,'kontaktdaten',`Feld fehlt: ${k}`); } }
    if(p.kontaktdaten.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.kontaktdaten.email)){ valid=false; push(messages,'kontaktdaten','E-Mail ungültig'); }
  }

  // kenntnisse
  const kf = p.kenntnisse_und_faehigkeiten;
  if(kf){
    if(!Array.isArray(kf.job_spezifisch) || kf.job_spezifisch.length<1){ valid=false; push(messages,'kenntnisse_und_faehigkeiten','Mind. 1 job_spezifisch'); }
    if(!Array.isArray(kf.software)){ valid=false; push(messages,'kenntnisse_und_faehigkeiten','software muss Liste sein'); }
    if(!Array.isArray(kf.sprachen)){ valid=false; push(messages,'kenntnisse_und_faehigkeiten','sprachen muss Liste sein'); }
    if(!Array.isArray(kf.persoenliche_staerken)){ valid=false; push(messages,'kenntnisse_und_faehigkeiten','persoenliche_staerken muss Liste sein'); }
  }

  // werdegang: allow 0 stations; validate shape only for present items
  if(Array.isArray(p.beruflicher_werdegang)){
    p.beruflicher_werdegang.forEach((s, idx)=>{
      const need = ['jobtitel','unternehmenstyp','dauer','ort','aufgaben'];
      for(const k of need){ if(!(k in s)) { valid=false; push(messages,'beruflicher_werdegang',`Station ${idx+1}: Feld fehlt: ${k}`); } }
      // aufgaben may be empty; ensure it's an array when present
      if(s.aufgaben && !Array.isArray(s.aufgaben)){ valid=false; push(messages,'beruflicher_werdegang',`Station ${idx+1}: aufgaben muss Liste sein`); }
    });
  }

  // akademisch
  if(!Array.isArray(p.akademische_laufbahn) || p.akademische_laufbahn.length < 1){ valid=false; push(messages,'akademische_laufbahn','Mind. 1 Station'); }

  return { valid, messages };
}


