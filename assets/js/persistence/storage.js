const KEY = 'profil_generator_state_v1';

export function saveToLocal(snapshot){
  try{ localStorage.setItem(KEY, JSON.stringify(snapshot)); }catch(_){ /* ignore */ }
}

export function loadFromLocal(){
  try{
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  }catch(_){ return null; }
}

export function confirmBeforeUnload(isDirty){
  window.addEventListener('beforeunload', (e)=>{
    if(isDirty()){
      e.preventDefault();
      e.returnValue = '';
    }
  });
}


