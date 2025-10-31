function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d = new Date(); return d.getFullYear()+''+pad(d.getMonth()+1)+''+pad(d.getDate()); }

export function formatFilenameAndExport(profile){
  const wohnort = profile?.person_data?.wohnort || 'Profil';
  const rolle = extractRoleFromProfile(profile) || 'Profil';
  const name = `${wohnort}_${rolle}_${todayStr()}.pdf`.replace(/\s+/g,'_');
  // Try client-side PDF rendering via html2pdf if available; otherwise fall back to print
  const container = document.querySelector('.cvdoc');
  if(window.html2pdf && container){
    try{
      container.classList.add('exporting','no-css-band');
      // Match CSS @page margins (top/bottom 16mm, left/right 6mm) for wider usable width
      const opt = { margin: [16,6,16,6], filename: name, image: { type:'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS:true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      // Draw a vector footer band on every PDF page to guarantee placement
      // @ts-ignore
      window.html2pdf().from(container).set(opt).toPdf().get('pdf').then((pdf)=>{
        const pageCount = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const bandHeight = pageHeight * 0.10; // 10% of page height
        pdf.setFillColor(0,33,77); // #00214d
        for(let i=1;i<=pageCount;i++){
          pdf.setPage(i);
          pdf.rect(0, pageHeight - bandHeight, pageWidth, bandHeight, 'F');
        }
      }).save().finally(()=>{
        container.classList.remove('exporting','no-css-band');
      });
      return;
    }catch(e){ /* fall through to print */ }
  }
  // Fallback: system print dialog
  const prevTitle = document.title; document.title = ' ';
  if(container){ container.classList.add('exporting'); }
  const restore = ()=>{ document.title = prevTitle; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', ()=>{ restore(); if(container){ container.classList.remove('exporting'); } });
  setTimeout(()=> window.print(), 50);
}

function extractRoleFromProfile(p){
  // Prefer first job title
  const firstJob = Array.isArray(p?.beruflicher_werdegang) && p.beruflicher_werdegang[0];
  const jt = firstJob && String(firstJob.jobtitel || '').trim();
  if(jt) return jt;

  // Fallback: extract a short title phrase from berufsziel
  const bz = String(p?.berufsziel || '');
  const phrase = bz.match(/\b([A-ZÄÖÜ][\wÄÖÜäöüß\-]+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß\-]+){0,3})\b/);
  return phrase ? phrase[1] : null;
}


