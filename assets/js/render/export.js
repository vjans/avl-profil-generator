function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d = new Date(); return d.getFullYear()+''+pad(d.getMonth()+1)+''+pad(d.getDate()); }

export function formatFilenameAndExport(profile){
  const wohnort = profile?.person_data?.wohnort || 'Profil';
  const rolle = extractRoleFromProfile(profile) || 'Profil';
  const name = `${wohnort}_${rolle}_${todayStr()}.pdf`.replace(/\s+/g,'_');
  // Try client-side PDF rendering via html2pdf if available; otherwise fall back to print
  const cvdoc = document.querySelector('.cvdoc');
  const paper = cvdoc && cvdoc.querySelector('.paper');
  if(window.html2pdf && cvdoc && paper){
    try{
      cvdoc.classList.add('exporting','no-css-band');
      // Keep the footer band at the true page bottom, but reserve enough bottom margin
      // so content never reaches into the band area.
      const bandHeight = 30; // mm
      const footerGap = 16; // mm visual gap between content and band
      const opt = {
        margin: [16,6,bandHeight + footerGap,6],
        filename: name,
        image: { type:'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS:true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Prefer CSS-based breaks, but allow large blocks to split naturally.
        pagebreak: { mode: ['css','legacy'], avoid: ['.avoid-break','.skills-subgroup','.workexp-head'] }
      };

      // Pre-flight: insert dynamic page breaks so headings/sections don't get orphaned
      // by the canvas slicing step (html2pdf renders once then slices into pages).
      const cleanupBreaks = applySoftPageBreaks(cvdoc, paper, opt);

      // Draw a vector footer band on every PDF page to guarantee placement
      // @ts-ignore
      window.html2pdf().from(cvdoc).set(opt).toPdf().get('pdf').then((pdf)=>{
        const pageCount = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        // True bottom band (as originally), relying on the enlarged bottom margin to prevent overlap.
        const bandY = pageHeight - bandHeight;
        for(let i=1;i<=pageCount;i++){
          pdf.setPage(i);
          // Set the fill color per page to avoid any state carry-over differences.
          pdf.setFillColor(0,33,77); // #00214d
          pdf.rect(0, bandY, pageWidth, bandHeight, 'F');
        }
      }).save().finally(()=>{
        try{ cleanupBreaks(); }catch(e){ /* ignore */ }
        cvdoc.classList.remove('exporting','no-css-band');
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


function applySoftPageBreaks(container, baseEl, opt){
  const marked = [];
  const baseRect = baseEl.getBoundingClientRect();
  const baseWidthPx = baseRect.width || 0;
  if(!baseWidthPx) return ()=>{};

  // html2pdf scales the element to the PDF inner width, then slices by PDF inner height.
  // In DOM px terms, one page slice height is proportional to the inner aspect ratio:
  // domPageHeightPx = domWidthPx * (innerHeightMm / innerWidthMm)
  const margin = opt && opt.margin ? opt.margin : [16,6,16,6];
  const marginTopMm = margin[0] || 0;
  const marginLeftMm = margin[1] || 0;
  const marginBottomMm = margin[2] || 0;
  const marginRightMm = margin[3] || 0;
  const innerWidthMm = 210 - marginLeftMm - marginRightMm;
  const innerHeightMm = 297 - marginTopMm - marginBottomMm;
  if(innerWidthMm <= 0 || innerHeightMm <= 0) return ()=>{};
  const domPageHeightPx = baseWidthPx * (innerHeightMm / innerWidthMm);
  const baseTop = baseRect.top;

  // Candidates we want to keep together if they'd be split by the page slice.
  // This is intentionally limited to avoid pushing "whole blocks" unnecessarily.
  const candidates = Array.from(container.querySelectorAll('.skills-subgroup, .workexp'));

  for(const el of candidates){
    // Skip if already forced.
    if(el && el.dataset && el.dataset.exportPb === '1') continue;
    const r = el.getBoundingClientRect();
    const top = r.top - baseTop;
    const bottom = r.bottom - baseTop;
    const h = r.height || (bottom - top);
    if(h <= 0) continue;

    const pageIndex = Math.floor((top + 1) / domPageHeightPx);
    const pageBottom = (pageIndex + 1) * domPageHeightPx;

    // If the element crosses a page boundary (would be sliced), push it to the next page,
    // but only if it can reasonably fit on a page.
    if(bottom > pageBottom && h < domPageHeightPx * 0.98){
      el.style.breakBefore = 'page';
      el.style.pageBreakBefore = 'always';
      el.dataset.exportPb = '1';
      marked.push(el);
    }
  }

  return ()=>{
    for(const el of marked){
      try{
        delete el.dataset.exportPb;
        el.style.breakBefore = '';
        el.style.pageBreakBefore = '';
      }catch(e){ /* ignore */ }
    }
  };
}


