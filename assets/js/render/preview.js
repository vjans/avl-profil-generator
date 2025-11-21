let updatePageInfoCb = null;

export function initPaged(onPageInfo){
  updatePageInfoCb = onPageInfo;
  if(window.Paged){
    new window.Paged.Previewer();
  }
}

export function updatePageInfo(info){
  const el = document.getElementById('preview-pageinfo');
  el.textContent = `Seite ${info.current||1} von ${info.total||1}`;
}

export function renderPreview(profile, ui){
  const root = document.getElementById('preview-root');
  if(!profile){ root.innerHTML = '<div class="paper"><div class="page"><div style="padding:16mm">Noch kein Profil. Bitte generieren.</div></div></div>'; return; }
  root.innerHTML = '';
  const html = template(profile, ui);
  const cont = document.createElement('div');
  cont.innerHTML = html;
  root.append(cont);

  // Trigger Paged.js to paginate
  if(window.Paged && window.Paged.polyfill){
    window.Paged.polyfill.preview(cont, [], { force: true }).then((flow)=>{
      if(updatePageInfoCb){ updatePageInfoCb({ total: flow.total, current: 1 }); }
    }).catch(()=>{ if(updatePageInfoCb) updatePageInfoCb({ total: 1, current: 1 }); });
  }
}

function esc(s){ return String(s==null?'':s); }

function template(p, ui){
  const logo = 'assets/logo.PNG';
  const title = escapeHtml(topTitle(p));
  return `
<div class="cvdoc">
  <div class="paper">
    <img class="export-logo" src="assets/logo.PNG" alt="Firmenlogo">
    <div class="export-band" aria-hidden="true"></div>
    <section class="page">
      <header class="page-header avoid-break">
        <div class="title">${title}</div>
      </header>
      <section class="columns">
        <aside class="col-left">
          <div class="block avoid-break">
            <h2>Interne Kennung</h2>
            <div class="kv kv-single">
              <div class="row"><span class="lab">Profil-ID:</span><span class="val">${escapeHtml(p.meta?.profil_id || '')}</span></div>
              <div class="row"><span class="lab">Name:</span><span class="val">${escapeHtml(p.person_data.name||'')}</span></div>
              <div class="row"><span class="lab">Geburtsjahr:</span><span class="val">${escapeHtml(p.person_data.geburtsjahr||'')}</span></div>
              <div class="row"><span class="lab">Wohnort:</span><span class="val">${escapeHtml(p.person_data.wohnort||'')}</span></div>
              <div class="row"><span class="lab">Familienstand:</span><span class="val">${escapeHtml(p.person_data.familienstand||'')}</span></div>
              <div class="row"><span class="lab">Staatsangehörigkeit:</span><span class="val">${escapeHtml(p.person_data.staatsangehoerigkeit||'')}</span></div>
            </div>
          </div>
          <div class="block avoid-break">
            <h2>Rahmenbedingungen</h2>
            <div class="kv kv-single">
              <div class="row"><span class="lab">Gehaltswunsch:</span><span class="val">${escapeHtml(p.rahmenbedingungen.gehaltswunsch||'')}</span></div>
              <div class="row"><span class="lab">Verfügbarkeit:</span><span class="val">${escapeHtml(p.rahmenbedingungen.verfuegbarkeit||'')}</span></div>
            </div>
          </div>
          <div class="block">
            <h2>Kenntnisse &amp; Fähigkeiten</h2>
            <div class="subhead">Haupt Job-Relevantes Skillset</div>
            <div class="list-plain">
              ${p.kenntnisse_und_faehigkeiten.job_spezifisch.map(s=>`<div>${escapeHtml(s)}</div>`).join('')}
            </div>
            <div class="subhead">Softwarekenntnisse</div>
            <div class="list-plain">
              ${p.kenntnisse_und_faehigkeiten.software.map(s=>`<div>${escapeHtml(s)}</div>`).join('')}
            </div>
            <div class="subhead">Sprachen</div>
            <div class="list-plain">
              ${p.kenntnisse_und_faehigkeiten.sprachen.map(s=>`<div>${escapeHtml(s.sprache)}: ${escapeHtml(s.niveau)}</div>`).join('')}
            </div>
            <div class="subhead">Persönliche Stärken</div>
            <div class="list-plain">
              ${p.kenntnisse_und_faehigkeiten.persoenliche_staerken.map(s=>`<div>${escapeHtml(s)}</div>`).join('')}
            </div>
          </div>
        </aside>
        <main class="col-right">
          <div class="block avoid-break">
            <h2>Kontaktdaten</h2>
            <div class="contact">
              <div class="row"><span class="label">Name</span>: ${escapeHtml(p.kontaktdaten?.name || '')}</div>
              <div class="row"><span class="label">Mail</span>: ${escapeHtml(p.kontaktdaten?.email || '')}</div>
              <div class="row"><span class="label">Phone</span>: ${escapeHtml(p.kontaktdaten?.telefon || '')}</div>
            </div>
          </div>
          <div class="block">
            <h2>Berufsziel</h2>
            <p class="prewrap berufsziel">${escapeHtml(p.berufsziel||'')}</p>
          </div>
          ${Array.isArray(p.beruflicher_werdegang) && p.beruflicher_werdegang.length>0 ? `<div class="block">
            <h2>Beruflicher Werdegang</h2>
            ${p.beruflicher_werdegang.map(st=>`<section class="workexp avoid-break">
              <h3>${escapeHtml(st.jobtitel)}</h3>
              <div class="where">${escapeHtml(st.unternehmenstyp)} · ${escapeHtml(st.dauer)} · ${escapeHtml(st.ort)}</div>
              <ul class="list">
                ${renderTasks(st.aufgaben)}
              </ul>
            </section>`).join('')}
          </div>` : ''}
          <div class="block avoid-break edu">
            <h2>Akademische Laufbahn</h2>
            ${p.akademische_laufbahn.map(st=>`<div>
              <h3>${escapeHtml(st.station)}</h3>
              <div class="where">${escapeHtml(st.dauer)} · ${escapeHtml(st.ort)}</div>
            </div>`).join('')}
          </div>
        </main>
      </section>
    </section>
  </div>
</div>`;
}

function jobCard(st){
  return `
    <article class="job-card">
      <div class="job-meta">
        <b>${escapeHtml(st.jobtitel)}</b>
        <div>${escapeHtml(st.unternehmenstyp)}</div>
        <div>${escapeHtml(st.dauer)}</div>
        <div>${escapeHtml(st.ort)}</div>
      </div>
      <div class="job-detail">
        <div class="block">
          <div class="block-title"><b>Aufgaben</b></div>
          <ul class="list">${renderTasks(st.aufgaben)}</ul>
        </div>
      </div>
    </article>
  `;
}

function topTitle(p){
  // Prefer the first job title from beruflicher_werdegang
  const firstJob = Array.isArray(p.beruflicher_werdegang) && p.beruflicher_werdegang[0];
  const jt = firstJob && String(firstJob.jobtitel || '').trim();
  if(jt) return jt; // allow multi-word titles as-is

  // Fallback: attempt to extract a reasonable title phrase (1–4 words) from berufsziel
  const bz = String(p.berufsziel || '');
  // Look for patterns like "Senior Softwareentwickler", "Leitender Projektmanager IT"
  const phrase = bz.match(/\b([A-ZÄÖÜ][\wÄÖÜäöüß\-]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß\-]+){0,3})\b/);
  if(phrase && phrase[1]) return phrase[1];

  return 'Profil';
}

function escapeHtml(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function templateStatic(){ return '' }

function isKpiBullet(text){
  const s = String(text||'');
  // Filter out KPI-like bullets: numbers, percentages, increase/decrease verbs
  if(/[\d%]/.test(s)) return true;
  const bad = /(prozent|%|steiger|erh[öo]h|reduz|sank|verbesser|ergebnis|kennzahl)/i;
  return bad.test(s);
}

function renderTasks(list){
  const arr = Array.isArray(list) ? list : [];
  const filtered = arr.filter(a=> !isKpiBullet(a));
  return filtered.map(a=>`<li>${escapeHtml(a)}</li>`).join('');
}


