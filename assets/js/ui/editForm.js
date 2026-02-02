import { appState } from '../state.js';

function el(tag, attrs={}, ...children){
  const n = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(k==='class') n.className = v; else if(k==='for') n.htmlFor = v; else if(k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
  }
  for(const c of children){ n.append(c); }
  return n;
}

function bindInput(obj, path, input, onChange){
  input.addEventListener('input', ()=>{
    const parts = path.split('.');
    let ref = obj;
    for(let i=0;i<parts.length-1;i++){ ref = ref[parts[i]]; }
    ref[parts[parts.length-1]] = input.type==='number' ? Number(input.value) : input.value;
    appState.flags.dirty = true;
    onChange();
  });
}

function arrayEditor(items, { onChange, label, min=0, max=99 }){
  const wrap = el('div', { class:'list-editor' });
  const list = el('div', { class:'list' });
  const addBtn = el('button', { class:'btn', type:'button' }, '+');
  addBtn.addEventListener('click', ()=>{
    if(items.length>=max) return;
    items.push('');
    render();
    onChange();
  });
  function render(){
    list.innerHTML = '';
    items.forEach((val, idx)=>{
      const row = el('div', { class:'field-row' });
      const input = el('input', { type:'text', value: val, placeholder: label+' …' });
      input.addEventListener('input', ()=>{ items[idx] = input.value; onChange(); });
      const rm = el('button', { class:'btn', type:'button' }, '–');
      rm.addEventListener('click', ()=>{ if(items.length>min){ items.splice(idx,1); render(); onChange(); }});
      row.append(input, rm);
      list.append(row);
    });
  }
  render();
  wrap.append(list, addBtn);
  return wrap;
}

function badge(valid, text){
  return el('span', { class: 'badge ' + (valid ? 'ok' : 'warn'), title: text }, valid ? '✓' : '!', ' ', text);
}

export function initEditForm(getProfile, onChange, getValidation){
  const root = document.getElementById('edit-form-root');

  function rerender(){
    root.innerHTML = '';
    const profile = getProfile();
    if(!profile){ root.append(el('div', {}, 'Kein Profil vorhanden.')); return; }
    ensureProfileShape(profile);
    const v = getValidation();

    // person_data
    root.append(section('Person', v.messages.person_data, (sec)=>{
      sec.append(field('Name', 'person_data.name', profile.person_data.name, onChange, true));
      sec.append(field('Geburtsjahr', 'person_data.geburtsjahr', profile.person_data.geburtsjahr||'', onChange));
      sec.append(field('Wohnort', 'person_data.wohnort', profile.person_data.wohnort||'', onChange));
      sec.append(field('Familienstand', 'person_data.familienstand', profile.person_data.familienstand||'', onChange));
      sec.append(field('Staatsangehörigkeit', 'person_data.staatsangehoerigkeit', profile.person_data.staatsangehoerigkeit||'', onChange));
    }));

    // kontaktdaten (Recruiter)
    root.append(section('Kontaktdaten (Recruiter)', v.messages.kontaktdaten, (sec)=>{
      sec.append(field('Name', 'kontaktdaten.name', profile.kontaktdaten.name, onChange));
      sec.append(field('E‑Mail', 'kontaktdaten.email', profile.kontaktdaten.email, onChange));
      sec.append(field('Telefon', 'kontaktdaten.telefon', profile.kontaktdaten.telefon, onChange));
    }));

    // rahmenbedingungen
    root.append(section('Rahmenbedingungen', v.messages.rahmenbedingungen, (sec)=>{
      sec.append(field('Gehaltswunsch', 'rahmenbedingungen.gehaltswunsch', profile.rahmenbedingungen.gehaltswunsch||'', onChange));
      sec.append(field('Verfügbarkeit', 'rahmenbedingungen.verfuegbarkeit', profile.rahmenbedingungen.verfuegbarkeit||'', onChange));
    }));

    // berufsziel
    root.append(section('Berufsziel', v.messages.berufsziel, (sec)=>{
      const ta = el('textarea', { rows:'4' });
      ta.value = profile.berufsziel || '';
      ta.addEventListener('input', ()=>{ profile.berufsziel = ta.value; onChange(); });
      sec.append(ta);
    }));

    // kenntnisse
    root.append(section('Kenntnisse & Fähigkeiten', v.messages.kenntnisse_und_faehigkeiten, (sec)=>{
      sec.append(el('h4', {}, 'Job-spezifisch'));
      sec.append(arrayEditor(profile.kenntnisse_und_faehigkeiten.job_spezifisch, { onChange, label:'Stichwort', min:1 }));
      sec.append(el('h4', {}, 'Software'));
      sec.append(arrayEditor(profile.kenntnisse_und_faehigkeiten.software, { onChange, label:'Tool' }));
      sec.append(el('h4', {}, 'Sprachen'));
      const langWrap = el('div', { class:'list' });
      profile.kenntnisse_und_faehigkeiten.sprachen.forEach((s, idx)=>{
        const row = el('div', { class:'field-row' });
        const lang = el('input', { type:'text', value: s.sprache, placeholder:'Sprache' });
        lang.addEventListener('input', ()=>{ s.sprache = lang.value; onChange(); });
        const niv = el('select', {});
        ['Grundkenntnisse','Gut','Fließend','Verhandlungssicher','Muttersprache'].forEach(n=>{
          const opt = el('option', { value:n }, n);
          if(n===s.niveau) opt.selected = true;
          niv.append(opt);
        });
        niv.addEventListener('change', ()=>{ s.niveau = niv.value; onChange(); });
        const rm = el('button', { class:'btn', type:'button' }, '–');
        rm.addEventListener('click', ()=>{ profile.kenntnisse_und_faehigkeiten.sprachen.splice(idx,1); rerender(); onChange(); });
        row.append(lang, niv, rm);
        langWrap.append(row);
      });
      const addLang = el('button', { class:'btn', type:'button' }, '+');
      addLang.addEventListener('click', ()=>{ profile.kenntnisse_und_faehigkeiten.sprachen.push({ sprache:'', niveau:'Gut' }); rerender(); onChange(); });
      sec.append(langWrap, addLang);
      sec.append(el('h4', {}, 'Persönliche Stärken'));
      sec.append(arrayEditor(profile.kenntnisse_und_faehigkeiten.persoenliche_staerken, { onChange, label:'Stärke' }));
    }));

    // beruflicher werdegang (suppress obsolete "Mind. 2 Stationen" warning if present)
    const wgMsgsRaw = (v && v.messages && v.messages.beruflicher_werdegang) || [];
    const wgMsgs = Array.isArray(wgMsgsRaw) ? wgMsgsRaw.filter(m => !/Mind\.?\s*2\s*Stationen/i.test(String(m||''))) : [];
    root.append(section('Beruflicher Werdegang', wgMsgs, (sec)=>{
      profile.beruflicher_werdegang.forEach((st, idx)=>{
        const card = el('div', { class:'accordion' });
        const details = el('details');
        const summary = el('summary', {}, `Station ${idx+1}: ${st.jobtitel}`);
        const body = el('div', { class:'section-body' });
        body.append(field('Jobtitel', `beruflicher_werdegang.${idx}.jobtitel`, st.jobtitel, onChange));
        body.append(field('Unternehmenstyp', `beruflicher_werdegang.${idx}.unternehmenstyp`, st.unternehmenstyp, onChange));
        body.append(field('Dauer', `beruflicher_werdegang.${idx}.dauer`, st.dauer, onChange));
        body.append(field('Ort', `beruflicher_werdegang.${idx}.ort`, st.ort, onChange));
        body.append(el('label', {}, 'Aufgaben'));
        body.append(arrayEditor(st.aufgaben, { onChange, label:'Aufgabe', min:0, max:12 }));
        details.append(summary, body);
        card.append(details);
        sec.append(card);
      });
      const addSt = el('button', { class:'btn', type:'button' }, '+ Station');
      addSt.addEventListener('click', ()=>{
        profile.beruflicher_werdegang.push({
          jobtitel:'',unternehmenstyp:'',dauer:'',ort:'',aufgaben:[]
        });
        rerender();
        onChange();
      });
      const rmSt = el('button', { class:'btn', type:'button' }, '– Station');
      rmSt.addEventListener('click', ()=>{ if(profile.beruflicher_werdegang.length>0){ profile.beruflicher_werdegang.pop(); rerender(); onChange(); }});
      sec.append(addSt, rmSt);
    }));

    // akademische laufbahn
    root.append(section('Akademische Laufbahn', v.messages.akademische_laufbahn, (sec)=>{
      profile.akademische_laufbahn.forEach((st, idx)=>{
        const box = el('div', { class:'accordion' });
        const details = el('details');
        const summary = el('summary', {}, `Station ${idx+1}: ${st.station}`);
        const body = el('div', { class:'section-body' });
        body.append(field('Station', `akademische_laufbahn.${idx}.station`, st.station, onChange));
        body.append(field('Dauer', `akademische_laufbahn.${idx}.dauer`, st.dauer, onChange));
        body.append(field('Ort', `akademische_laufbahn.${idx}.ort`, st.ort, onChange));
        details.append(summary, body);
        box.append(details);
        sec.append(box);
      });
      const add = el('button', { class:'btn', type:'button' }, '+ Station');
      add.addEventListener('click', ()=>{ profile.akademische_laufbahn.push({ station:'', dauer:'', ort:'' }); rerender(); onChange(); });
      const rm = el('button', { class:'btn', type:'button' }, '– Station');
      rm.addEventListener('click', ()=>{ if(profile.akademische_laufbahn.length>1){ profile.akademische_laufbahn.pop(); rerender(); onChange(); }});
      sec.append(add, rm);
    }));
  }

  function section(title, msg, fill){
    const det = document.createElement('details');
    det.className = 'accordion';
    det.open = false;
    const sum = document.createElement('summary');
    sum.append(title, ' ', badge(!(msg&&msg.length), msg&&msg[0] ? msg[0] : ''));
    const body = document.createElement('div');
    body.className = 'section-body';
    fill(body);
    det.append(sum, body);
    return det;
  }

  function field(labelText, path, value, onChange, readOnly=false){
    const id = 'f_'+path.replace(/[^a-z0-9_\-\.]/gi,'_');
    const wrap = el('div', { class:'field-row' });
    const lab = el('label', { for:id }, labelText);
    const inp = el('input', { id, type:'text', value: value ?? '', ...(readOnly?{readonly:'true'}:{}) });
    bindInput(appState.editedProfile, path, inp, onChange);
    wrap.append(lab, inp);
    return wrap;
  }

  // Expose rerender for when validation changes externally
  initEditForm.rerender = rerender;
  // Initial render
  rerender();
}

function ensureProfileShape(p){
  p.person_data = p.person_data || { name:'[Anonymisiert]', geburtsjahr:'', wohnort:'', familienstand:'', staatsangehoerigkeit:'' };
  p.kontaktdaten = p.kontaktdaten || { name:'', email:'', telefon:'' };
  p.rahmenbedingungen = p.rahmenbedingungen || { gehaltswunsch:'', verfuegbarkeit:'' };
  p.berufsziel = p.berufsziel || '';
  p.kenntnisse_und_faehigkeiten = p.kenntnisse_und_faehigkeiten || {
    job_spezifisch: [], software: [], sprachen: [], persoenliche_staerken: []
  };
  p.kenntnisse_und_faehigkeiten.job_spezifisch ||= [];
  p.kenntnisse_und_faehigkeiten.software ||= [];
  p.kenntnisse_und_faehigkeiten.sprachen ||= [];
  p.kenntnisse_und_faehigkeiten.persoenliche_staerken ||= [];
  p.beruflicher_werdegang = Array.isArray(p.beruflicher_werdegang) ? p.beruflicher_werdegang : [];
  p.akademische_laufbahn = Array.isArray(p.akademische_laufbahn) ? p.akademische_laufbahn : [];
}


