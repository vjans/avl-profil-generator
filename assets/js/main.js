import { appState } from './state.js';
import { initTabs } from './ui/tabs.js';
import { initInputForm } from './ui/inputForm.js';
import { initEditForm } from './ui/editForm.js';
import { renderPreview, updatePageInfo, initPaged } from './render/preview.js';
import { generateProfile } from './openai/client.js';
import { validateProfile } from './schema/validator.js';
import { saveToLocal, loadFromLocal, confirmBeforeUnload } from './persistence/storage.js';
import { applyOverflowPolicy } from './render/overflow.js';
import { formatFilenameAndExport } from './render/export.js';

function showToast(message){
  const t = document.getElementById('toast');
  t.textContent = message;
  t.hidden = false;
  window.clearTimeout(showToast._tid);
  showToast._tid = window.setTimeout(()=>{ t.hidden = true; }, 2500);
}

function showLoading(show){
  const ov = document.getElementById('loading-overlay');
  const btnGen = document.getElementById('btn-generate');
  const btnGenHeader = document.getElementById('btn-generate-header');
  if(show){
    ov.hidden = false;
    btnGen?.setAttribute('disabled','true');
    btnGenHeader?.setAttribute('disabled','true');
  }else{
    ov.hidden = true;
    btnGen?.removeAttribute('disabled');
    btnGenHeader?.removeAttribute('disabled');
  }
}

function syncPreview(){
  const compact = appState.ui.onePagerMode;
  const compacted = applyOverflowPolicy(appState.editedProfile, { onePager: compact });
  renderPreview(compacted, appState.ui);
}

function bindHeaderButtons(){
  // Header "LLM generieren" entfernt
  document.getElementById('btn-reset').addEventListener('click', ()=>{
    appState.reset();
    syncPreview();
    showToast('Zurückgesetzt');
  });
  document.getElementById('btn-export').addEventListener('click', ()=>{
    formatFilenameAndExport(appState.editedProfile);
  });
  // Help lightbox
  const helpBtn = document.getElementById('btn-help');
  const helpOv = document.getElementById('help-overlay');
  const helpClose = document.getElementById('help-close');
  if(helpBtn && helpOv && helpClose){
    const openHelp = ()=>{ helpOv.hidden = false; };
    const closeHelp = ()=>{ helpOv.hidden = true; };
    helpBtn.addEventListener('click', openHelp);
    helpClose.addEventListener('click', closeHelp);
    helpOv.addEventListener('click', (e)=>{ if(e.target === helpOv) closeHelp(); });
    document.addEventListener('keydown', (e)=>{ if(!helpOv.hidden && e.key === 'Escape') closeHelp(); });
  }
}

function extractProfileId(text){
  // Matches patterns like "Profil 9483" or "Profil-ID: 9483"
  const m = String(text).match(/Profil(?:-ID)?\s*[:#]?\s*(\d{3,})/i);
  return m ? `Profil ${m[1]}` : '';
}

async function onGenerate({ rawSnippet, recruiter, jobLocation, openaiConfig }){
  try{
    appState.flags.loading = true;
    showLoading(true);
    // Augment recruiter object with job location for prompt
    const recruiterWithLoc = { ...recruiter, standort_stellenangebot: jobLocation || '' };
    const profile = await generateProfile(rawSnippet, recruiterWithLoc, openaiConfig);
    // Attach extracted Profil-ID and provided job location to meta
    const pid = extractProfileId(rawSnippet);
    profile.meta = profile.meta || {};
    profile.meta.profil_id = profile.meta.profil_id || pid;
    profile.meta.standort_stellenangebot = profile.meta.standort_stellenangebot || (jobLocation || '');
    // Ensure person_data fallbacks
    profile.person_data = profile.person_data || { name:'[Anonymisiert]', geburtsjahr:'', wohnort:'', familienstand:'', staatsangehoerigkeit:'' };
    profile.person_data.staatsangehoerigkeit = 'deutsch';
    profile.person_data.familienstand = 'ledig';
    appState.setGeneratedProfile(profile);
    appState.setEditedProfile(JSON.parse(JSON.stringify(profile)));
    // Re-render edit form with the new profile
    if (initEditForm && initEditForm.rerender) initEditForm.rerender();
    const v = validateProfile(appState.editedProfile);
    appState.validation = v;
    if(!v.valid) showToast('Profil generiert – bitte prüfen (Validierungshinweise vorhanden)');
    syncPreview();
    // Switch to edit tab
    document.getElementById('tabbtn-profil').click();
  }catch(err){
    console.error(err);
    showToast(err.userMessage || 'Fehler bei der Generierung');
  }finally{
    appState.flags.loading = false;
    showLoading(false);
  }
}

function onEditChange(){
  // Validate after edits and re-render
  const v = validateProfile(appState.editedProfile);
  appState.validation = v;
  syncPreview();
}

function restoreSaved(){
  const saved = loadFromLocal();
  if(saved){
    appState.hydrate(saved);
    syncPreview();
    if (initEditForm && initEditForm.rerender) initEditForm.rerender();
  }

  // Mark left panel as too-tall if content exceeds viewport height to control scrollbar visibility
  const leftPane = document.querySelector('.pane-left');
  const activePanel = document.querySelector('.pane-left .tabpanel.active');
  const markTooTall = ()=>{
    if(!leftPane || !activePanel) return;
    activePanel.classList.toggle('too-tall', activePanel.scrollHeight > leftPane.clientHeight - 32);
  };
  window.addEventListener('resize', markTooTall);
  new MutationObserver(()=> markTooTall()).observe(activePanel, { subtree:true, childList:true, attributes:true });
  setTimeout(markTooTall, 0);
}

window.addEventListener('DOMContentLoaded', async ()=>{
  // Ensure loading overlay is hidden on initial load
  (function(){ const ov = document.getElementById('loading-overlay'); if(ov) ov.hidden = true; })();
  initTabs();
  bindHeaderButtons();
  initPaged(updatePageInfo);
  initInputForm(onGenerate);
  initEditForm(()=> appState.editedProfile, onEditChange, ()=>appState.validation);
  restoreSaved();
  confirmBeforeUnload(()=> appState.flags.dirty);

  // Einstellungen entfernt

  // Save periodically
  window.setInterval(()=>{ saveToLocal(appState.snapshot()); }, 1500);

  // View toggle
  const viewBtn = document.getElementById('btn-view-toggle');
  if(viewBtn){
    const appMain = document.querySelector('.app-main');
    const updateViewBtn = (isFull)=>{
      viewBtn.textContent = isFull ? 'Eingabe anzeigen' : 'Vollbild Vorschau';
      viewBtn.setAttribute('aria-pressed', isFull ? 'true' : 'false');
    };
    // initialize label
    updateViewBtn(!!(appMain && appMain.classList.contains('full-preview')));
    viewBtn.addEventListener('click', ()=>{
      if(!appMain) return;
      const isFull = appMain.classList.toggle('full-preview');
      updateViewBtn(isFull);
    });
  }

  // (Template Vorschau entfernt)
});


