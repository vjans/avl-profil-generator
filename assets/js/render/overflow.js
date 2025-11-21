// Apply caps and compaction for one-pager mode. Returns a derived profile object.

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

export function applyOverflowPolicy(profile, { onePager=false }={}){
  if(!profile) return profile;
  const p = clone(profile);
  // Caps
  p.beruflicher_werdegang = (p.beruflicher_werdegang||[]).slice(0,4);
  p.beruflicher_werdegang.forEach(st=>{
    st.aufgaben = (st.aufgaben||[]);
  });
  const k = p.kenntnisse_und_faehigkeiten;
  if(k){
    k.job_spezifisch = (k.job_spezifisch||[]).slice(0,8);
    k.software = (k.software||[]).slice(0,8);
    k.sprachen = (k.sprachen||[]).slice(0,4);
    k.persoenliche_staerken = (k.persoenliche_staerken||[]).slice(0,6);
  }

  // One-pager aggressive trim
  if(onePager){
    p.beruflicher_werdegang = p.beruflicher_werdegang.slice(0,3);
    p.beruflicher_werdegang.forEach(st=>{
      st.aufgaben = st.aufgaben.slice(0,3).map(trimBullet);
    });
    if(k){
      k.job_spezifisch = k.job_spezifisch.slice(0,6).map(trimBullet);
      k.software = k.software.slice(0,6).map(trimBullet);
      k.sprachen = k.sprachen.slice(0,3);
      k.persoenliche_staerken = k.persoenliche_staerken.slice(0,5).map(trimBullet);
    }
  }
  return p;
}

function trimBullet(s){
  const words = String(s||'').split(/\s+/);
  if(words.length<=14) return s;
  return words.slice(0,14).join(' ')+'…';
}


