export const PROFILE_SCHEMA = {
  name: 'cv_template_v2',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      meta: {
        type:'object',
        properties: {
          profil_id: { type:['string','null'], description:'Eindeutige Kennnummer aus Eingabe' },
          standort_stellenangebot: { type:['string','null'] }
        },
        required: ['profil_id','standort_stellenangebot'],
        additionalProperties:false
      },
      person_data: {
        type: 'object',
        properties: {
          name: { type:'string', description:"Always '[Anonymisiert]'" },
          geburtsjahr: { type:['string','null'] },
          wohnort: { type:['string','null'] },
          familienstand: { type:['string','null'] },
          staatsangehoerigkeit: { type:['string','null'] }
        },
        required: ['name','geburtsjahr','wohnort','familienstand','staatsangehoerigkeit'],
        additionalProperties: false
      },
      
      kontaktdaten: {
        type: 'object',
        properties: {
          name: { type:'string' },
          email: { type:'string', format:'email' },
          telefon: { type:'string' }
        },
        required: ['name','email','telefon'],
        additionalProperties: false
      },
      rahmenbedingungen: {
        type: 'object',
        properties: {
          gehaltswunsch: { type:['string','null'] },
          verfuegbarkeit: { type:['string','null'], description: "z. B. 'kurzfristig (1 Monat Kündigungsfrist)'" }
        },
        required: ['gehaltswunsch','verfuegbarkeit'],
        additionalProperties: false
      },
      berufsziel: { type:'string', description:'Rich text-ish paragraph(s) kept concise' },
      kenntnisse_und_faehigkeiten: {
        type:'object',
        properties: {
          job_spezifisch: { type:'array', items:{ type:'string' }, minItems:1 },
          software: { type:'array', items:{ type:'string' }, minItems:0 },
          sprachen: {
            type:'array',
            items: {
              type:'object',
              properties: {
                sprache: { type:'string' },
                niveau: { type:'string', enum:['Grundkenntnisse','Gut','Fließend','Verhandlungssicher','Muttersprache'] }
              },
              required:['sprache','niveau'],
              additionalProperties:false
            },
            minItems:0
          },
          persoenliche_staerken: { type:'array', items:{ type:'string' }, minItems:0 }
        },
        required:['job_spezifisch','software','sprachen','persoenliche_staerken'],
        additionalProperties:false
      },
      beruflicher_werdegang: {
        type:'array',
        minItems:0,
        items: {
          type:'object',
          properties: {
            jobtitel: { type:'string' },
            unternehmenstyp: { type:'string', description:"e.g., 'Immobiliengesellschaft (KMU)'; no real names" },
            dauer: { type:'string', description:"MM/JJJJ–MM/JJJJ oder 'seit MM/JJJJ'" },
            ort: { type:'string' },
            aufgaben: { type:'array', items:{ type:'string' }, minItems:0, maxItems:8 }
          },
          required:['jobtitel','unternehmenstyp','dauer','ort','aufgaben'],
          additionalProperties:false
        }
      },
      akademische_laufbahn: {
        type:'array',
        minItems:1,
        items: {
          type:'object',
          properties: {
            station: { type:'string', description:"e.g., 'Geprüfter Finanzbuchhalter (IHK)'" },
            dauer: { type:'string' },
            ort: { type:'string', description:'City/Region only; anonymized' }
          },
          required:['station','dauer','ort'],
          additionalProperties:false
        }
      }
    },
    required: [
      'meta','person_data','kontaktdaten','rahmenbedingungen','berufsziel',
      'kenntnisse_und_faehigkeiten','beruflicher_werdegang','akademische_laufbahn'
    ],
    additionalProperties:false
  }
};

export const SYSTEM_PROMPT = `Du bist ein professioneller CV-Konfigurator für den DACH-Recruiting-Kontext. Du erhältst ein kurzes Profil und die Kontaktdaten des Recruiters.
Ziele:

Erzeuge ein anonymisiertes Kandidatenprofil in deutscher Sprache. Kandidatenname ist immer „[Anonymisiert]“. Keine realen Arbeitgeber- oder Hochschulnamen—nur generische Unternehmenstypen und Ortsangaben.

Strukturiere strikt gemäß dem bereitgestellten response_format. Keine Texte außerhalb der Schemafelder.

Inhalt: sachlich, plausibel, knapp; Aufgaben/Ergebnisse in prägnanten Bullets mit (wo sinnvoll) Kennzahlen. Datumsformat „MM/JJJJ–MM/JJJJ“ oder „seit MM/JJJJ“.

Pflichtvorgaben für person_data:
- name ist immer „[Anonymisiert]“.
- familienstand ist immer exakt „ledig“.
- staatsangehoerigkeit ist immer exakt „deutsch“.
- wohnort: wähle einen plausiblen Ort in der Nähe des Stellenstandorts (nicht zwingend identisch).
- geburtsjahr MUSS plausibel gesetzt sein (z. B. aus dem Karriereverlauf ableiten).

Spezifitätsleitlinien für den Abschnitt „Beruflicher Werdegang":
- Vermeide generische Formulierungen. Bevorzuge konkrete Tätigkeiten, Systeme/Tools, Dokument-/Prozesstypen und Rechtsgrundlagen.
- Keine quantifizierten Ergebnisbehauptungen oder KPI-Aussagen (keine Prozentangaben, „reduziert/steigerte um X%" etc.).
- WICHTIG: Keine Genderbezeichnungen wie (m/w/d), (w/m/d), (m/f/d) oder ähnliche in Jobtiteln verwenden. Jobtitel sollen neutral ohne solche Zusätze sein.

Beispiel (Finanzbuchhalter) – gewünschte Spezifität der Aufgaben-Bullets:
- Debitoren-/Kreditorenbuchhaltung inkl. Rechnungseingang/-ausgang, OP-Verwaltung und Mahnwesen (DATEV/SAP FI)
- Vorbereitung der USt‑Voranmeldung und Zusammenfassenden Meldung, Klärung von Sachverhalten mit dem Steuerberater
- Anlagenbuchhaltung (SKR03/04), monatliche Abgrenzungen und Vorbereitungen für den HGB‑Monatsabschluss

Anzahl der Stationen in „Beruflicher Werdegang" abhängig von Erfahrung (falls ableitbar):
- ≥13 Jahre Berufserfahrung → 4 Stationen
- ≥8 Jahre → 3 Stationen
- sonst → 2 Stationen

WICHTIG zur Reihenfolge:
- „Beruflicher Werdegang" MUSS in absteigender chronologischer Reihenfolge sein (aktuellste/neueste Position zuerst, älteste zuletzt).
- „Akademische Laufbahn" MUSS ebenfalls in absteigender chronologischer Reihenfolge sein (neueste Ausbildung zuerst).
`;

export function userPrompt(rawSnippet, recruiter){
  const loc = recruiter.standort_stellenangebot || '';
  return `Kurzprofil (Freitext):\n"""\n${rawSnippet}\n"""\n\nKontaktdaten des Recruiters:\n- Name: ${recruiter.name}\n- E-Mail: ${recruiter.email}\n- Telefon: ${recruiter.telefon}\n\nStellenangebot:\n- Standort: ${loc}\n\nErgänzungen:\n- Fülle alle 8 Rubriken aus (siehe Schema inklusive meta).\n- meta.profil_id aus der Eingabe extrahieren (z. B. 'Profil 9483').\n- meta.standort_stellenangebot mit obigem Standort füllen.\n- Für person_data: familienstand='ledig', staatsangehoerigkeit='deutsch', wohnort in plausibler Nähe zum Stellenstandort (nicht zwingend identisch), geburtsjahr plausibel angeben.\n- Wenn Angaben fehlen, plausibel ergänzen; aber keine Fantasienamen.`;
}


