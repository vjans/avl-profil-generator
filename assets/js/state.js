export const appState = {
  generatedProfile: null,
  editedProfile: null,
  validation: { valid: true, messages: {} },
  ui: { theme: 'light', accent: 'blue', font: 'system-ui', onePagerMode: false },
  flags: { dirty: false, loading: false },
  setGeneratedProfile(p){ this.generatedProfile = p; this.flags.dirty = true; },
  setEditedProfile(p){ this.editedProfile = p; this.flags.dirty = true; },
  hydrate(snapshot){
    if(snapshot){
      this.generatedProfile = snapshot.generatedProfile || null;
      this.editedProfile = snapshot.editedProfile || null;
      this.validation = snapshot.validation || this.validation;
      this.ui = snapshot.ui || this.ui;
    }
  },
  snapshot(){
    return {
      generatedProfile: this.generatedProfile,
      editedProfile: this.editedProfile,
      validation: this.validation,
      ui: this.ui
    };
  },
  reset(){
    this.generatedProfile = null;
    this.editedProfile = null;
    this.validation = { valid: true, messages: {} };
    this.flags.dirty = false;
  }
};


