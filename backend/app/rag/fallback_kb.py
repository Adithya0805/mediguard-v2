# Curated local medical reference database representing high-acuity guidelines.
# Satisfies clinical requirements for offline-first RAG retrieval fallback across critical emergencies.

FALLBACK_KNOWLEDGE_BASE = [
    {
        "keywords": ["chest pain", "acs", "angina", "myocardial", "infarction", "coronary", "heart attack", "stemi", "nstemi", "troponin"],
        "source": "AHA/ACC 2026 Acute Coronary Syndrome Triage Guidelines",
        "text": (
            "1. Immediate 12-lead electrocardiogram (ECG) must be performed within 10 minutes of presentation.\n"
            "2. Serial high-sensitivity cardiac troponin (hs-cTn) assays should be drawn at 0-hour and 1-hour/2-hour protocols to rule in/rule out myocardial injury.\n"
            "3. Establish continuous cardiac telemetry monitoring immediately to detect malignant arrhythmias (VT/VF).\n"
            "4. Administer supplemental oxygen ONLY if SpO2 < 90% or patient exhibits signs of respiratory distress (maintain SpO2 > 94%).\n"
            "5. Secure dual large-bore intravenous (IV) access and draw baseline bloods: basic metabolic panel, complete blood count, and coagulation profile (PT/INR, aPTT).\n"
            "6. Order a portable chest X-ray to quickly evaluate for cardiomegaly, pulmonary congestion, or widened mediastinum (ruling out aortic dissection).\n"
            "7. Administer chewable non-enteric-coated Aspirin 324 mg immediately unless active severe gastrointestinal bleeding or true aspirin anaphylaxis is documented."
        )
    },
    {
        "keywords": ["stroke", "aphasia", "hemiparesis", "facial droop", "slurred", "speech", "neurological", "tia", "cerebrovascular"],
        "source": "AHA/ASA 2026 Acute Ischemic Stroke Management Guidelines",
        "text": (
            "1. Perform an immediate emergency neurological assessment using the NIH Stroke Scale (NIHSS).\n"
            "2. Obtain a non-contrast head CT scan or MRI within 25 minutes of patient presentation to rule out intracranial hemorrhage before thrombolytic therapy.\n"
            "3. Assess eligibility for intravenous thrombolysis (IV tPA / Tenecteplase) within the 3-hour to 4.5-hour stroke onset window.\n"
            "4. Manage blood pressure strictly: keep BP < 185/110 mmHg if the patient is a candidate for thrombolysis, or keep BP < 220/120 mmHg if not receiving tPA.\n"
            "5. Maintain absolute NPO (nothing by mouth) status until a formal bedside dysphagia screen is completed to prevent aspiration pneumonia.\n"
            "6. Obtain immediate fingerstick blood glucose to rule out hypoglycemia, which can simulate acute stroke symptoms."
        )
    },
    {
        "keywords": ["pulmonary embolism", "pe", "dvt", "dyspnea", "pleuritic", "chest pain", "tachycardia", "leg swelling", "thrombosis", "d-dimer"],
        "source": "ESC/ACCP Guidelines on Acute Pulmonary Embolism & Venous Thromboembolism",
        "text": (
            "1. Calculate pre-test clinical probability using Wells' score or revised Geneva score to direct diagnostic imaging pathway.\n"
            "2. In low/intermediate clinical probability patients, obtain high-sensitivity D-dimer assay; in high-probability patients, proceed directly to imaging.\n"
            "3. Perform CT Pulmonary Angiography (CTPA) as the definitive primary imaging modality for hemodynamically stable patients.\n"
            "4. In hemodynamically unstable patients (SBP < 90 mmHg or shock), perform emergent bedside echocardiogram to evaluate right ventricular (RV) overload.\n"
            "5. Initiate parenteral therapeutic anticoagulation (low-molecular-weight heparin or unfractionated heparin) immediately while awaiting imaging confirmation if clinical suspicion is high.\n"
            "6. Evaluate candidates for systemic thrombolysis (Alteplase) or catheter-directed thrombectomy in massive PE presenting with cardiogenic shock."
        )
    },
    {
        "keywords": ["sepsis", "septic shock", "fever", "hypotension", "tachycardia", "lactate", "bacteremia", "infection", "leukocytosis"],
        "source": "Surviving Sepsis Campaign 2026 International Guidelines for Sepsis Management",
        "text": (
            "1. Execute the 1-Hour Sepsis Bundle immediately upon identification: measure serum blood lactate level; remeasure if initial lactate > 2 mmol/L.\n"
            "2. Obtain blood cultures (minimum 2 sets: aerobic and anaerobic) prior to initiating antimicrobial therapy, without causing significant delay (>45 min).\n"
            "3. Administer broad-spectrum empirical intravenous antimicrobials within 1 hour of sepsis recognition.\n"
            "4. Rapidly administer 30 mL/kg intravenous crystalloid fluid bolus (e.g., balanced crystalloid / Lactated Ringer's) for hypotension (MAP < 65 mmHg) or serum lactate ≥ 4.0 mmol/L.\n"
            "5. Apply vasopressors (Norepinephrine as first-line agent) during or after fluid resuscitation to maintain Mean Arterial Pressure (MAP) ≥ 65 mmHg.\n"
            "6. Establish continuous arterial line monitoring and identify/control anatomical source of infection (abscess drainage, catheter removal, debridement) as rapidly as possible."
        )
    },
    {
        "keywords": ["anaphylaxis", "allergic reaction", "stridor", "angioedema", "urticaria", "hives", "epinephrine", "wheezing", "hypotension"],
        "source": "WAO/AAAAI Guidelines for Emergency Management of Acute Anaphylaxis",
        "text": (
            "1. Immediate Intramuscular (IM) Epinephrine (1:1000 dilution, 0.3 to 0.5 mg in adults, 0.01 mg/kg in pediatrics) in the anterolateral mid-thigh is the mandatory first-line therapy.\n"
            "2. Repeat IM Epinephrine dose every 5 to 15 minutes if symptoms persist or progress.\n"
            "3. Position the patient supine with lower extremities elevated; NEVER place the patient upright or standing, which can precipitate fatal empty vena cava syndrome.\n"
            "4. Administer high-flow 100% supplemental oxygen via non-rebreather mask; prepare for emergency endotracheal intubation or cricothyroidotomy if laryngeal edema develops.\n"
            "5. Secure dual large-bore IV lines and administer rapid crystalloid boluses (1-2 Liters NS/LR) for anaphylactic shock and vasodilation.\n"
            "6. Administer adjunctive second-line therapies (H1-antihistamines like Diphenhydramine, H2-antihistamines like Famotidine, and IV corticosteroids like Methylprednisolone), but NEVER delay epinephrine."
        )
    },
    {
        "keywords": ["diabetic ketoacidosis", "dka", "hyperglycemia", "ketones", "anion gap", "acidosis", "kussmaul", "polyuria", "hhs"],
        "source": "ADA Clinical Practice Recommendations for Diabetic Ketoacidosis & Hyperosmolar State",
        "text": (
            "1. Confirm diagnosis: serum blood glucose > 250 mg/dL, arterial/venous pH < 7.30, serum bicarbonate < 18 mEq/L, elevated beta-hydroxybutyrate, and elevated anion gap (> 12 mEq/L).\n"
            "2. Fluid resuscitation: Start IV 0.9% Normal Saline at 1000-1500 mL/hr during the first hour to restore intravascular volume and renal perfusion.\n"
            "3. Potassium assessment before insulin: If serum K+ < 3.3 mEq/L, withhold insulin and aggressively replace potassium (20-30 mEq/hr) until K+ > 3.3 mEq/L to prevent fatal cardiac arrhythmias.\n"
            "4. Continuous regular insulin infusion: 0.1 units/kg/hr IV once K+ ≥ 3.3 mEq/L. Target blood glucose drop of 50-75 mg/dL/hr.\n"
            "5. Switch fluids: When blood glucose reaches 200 mg/dL, add 5% Dextrose (D5 0.45% NS) to IV fluids while maintaining insulin infusion until ketoacidosis resolves (anion gap normalizes and venous pH > 7.30).\n"
            "6. Serial point-of-care laboratory monitoring of electrolytes, venous blood gas, and anion gap every 2 to 4 hours."
        )
    },
    {
        "keywords": ["asthma", "copd", "respiratory failure", "wheezing", "dyspnea", "bronchospasm", "hypercapnia", "hypoxia", "inhaler"],
        "source": "GINA / GOLD International Guidelines on Acute Obstructive Airway Exacerbations",
        "text": (
            "1. Administer high-dose inhaled short-acting beta-2 agonist (Albuterol 2.5-5 mg) combined with anticholinergic (Ipratropium bromide 0.5 mg) via continuous or frequent nebulization.\n"
            "2. Administer early systemic corticosteroids: Oral Prednisone 40-50 mg or IV Methylprednisolone 60-125 mg to decrease airway inflammation and reduce relapse.\n"
            "3. Controlled oxygen therapy: In COPD, titrate oxygen delivery (Venturi mask or nasal cannula) to a target SpO2 of 88% to 92% to avoid hypercapnic respiratory drive suppression.\n"
            "4. Intravenous Magnesium Sulfate (2 g IV infusion over 20 minutes) for severe acute asthma exacerbations unresponsive to initial bronchodilator therapy.\n"
            "5. Non-Invasive Positive Pressure Ventilation (BiPAP/NIV) is the first-line ventilatory support for acute hypercapnic COPD exacerbations (pH < 7.35, PaCO2 > 45 mmHg).\n"
            "6. Assess for signs of impending respiratory exhaustion: silent chest, cyanosis, lethargy, or paradoxical thoracoabdominal breathing, indicating immediate need for RSI and endotracheal intubation."
        )
    },
    {
        "keywords": ["hypertensive emergency", "hypertension", "blood pressure", "encephalopathy", "headache", "papilledema", "bp crisis"],
        "source": "AHA/ACC Guidelines on Severe Hypertensive Crisis & Emergency Triage",
        "text": (
            "1. Differentiate Hypertensive Emergency (acute target-organ damage to brain, heart, aorta, kidneys, or eyes) from Hypertensive Urgency (isolated severe BP elevation without end-organ injury).\n"
            "2. Target blood pressure reduction: Reduce Mean Arterial Pressure (MAP) by NO MORE than 20% to 25% within the first hour to avoid cerebral, coronary, or renal hypoperfusion and watershed infarction.\n"
            "3. In the subsequent 2 to 6 hours, gradually reduce BP toward 160/100 mmHg if stable, followed by cautious normalization over the next 24 to 48 hours.\n"
            "4. Preferred first-line intravenous titratable antihypertensive infusions: Labetalol (combined alpha/beta blocker) or Nicardipine / Clevidipine (calcium channel blockers).\n"
            "5. Critical exceptions to gradual BP lowering: Acute aortic dissection requires rapid reduction of SBP to < 120 mmHg and heart rate < 60 bpm within 20 minutes (using IV Esmolol + Vasodilator).\n"
            "6. Screen for acute target-organ damage: 12-lead ECG, cardiac troponin, basic metabolic panel (creatinine, BUN), urinalysis for protein/RBC casts, and non-contrast head CT if altered mental status."
        )
    },
    {
        "keywords": ["meningitis", "fever", "neck stiffness", "meningismus", "headache", "photophobia", "lumbar puncture", "kernig", "brudzinski"],
        "source": "IDSA Guidelines on the Management of Bacterial Meningitis",
        "text": (
            "1. Obtain emergency blood cultures immediately upon suspicion of acute bacterial meningitis.\n"
            "2. Perform emergency Lumbar Puncture (LP) for CSF analysis (cell count, protein, glucose, Gram stain, and bacterial culture) unless screening non-contrast head CT is indicated.\n"
            "3. Indications for head CT before LP: immunocompromised state, history of CNS disease, new onset seizures within 1 week, papilledema, abnormal level of consciousness, or focal neurological deficit.\n"
            "4. NEVER delay empiric antimicrobial therapy if lumbar puncture is delayed for neuroimaging or clinical stabilization.\n"
            "5. Empiric antimicrobial regimen: IV Vancomycin (15-20 mg/kg q8-12h) PLUS Ceftriaxone (2 g IV q12h); add Ampicillin (2 g IV q4h) for patients > 50 years old or immunocompromised to cover Listeria monocytogenes.\n"
            "6. Administer adjunctive IV Dexamethasone (10 mg IV) prior to or simultaneously with the first antibiotic dose to attenuate inflammatory hearing loss and neurological sequelae in Streptococcus pneumoniae meningitis."
        )
    },
    {
        "keywords": ["gi bleed", "gastrointestinal bleeding", "hematemesis", "melena", "hematochezia", "peptic ulcer", "rectal bleeding"],
        "source": "ACG Clinical Guidelines on Upper and Lower Gastrointestinal Bleeding",
        "text": (
            "1. Assess hemodynamic stability immediately: orthostatic vitals, tachycardia, hypotension, and mental status indicating hemorrhagic shock.\n"
            "2. Secure dual large-bore (16-18 gauge) peripheral IV lines and send stat type and crossmatch for packed red blood cells (PRBCs), CBC, coagulation profile (PT/INR, PTT), and liver chemistry.\n"
            "3. Restrictive transfusion strategy: Transfuse PRBCs to maintain hemoglobin ≥ 7 g/dL in general patients, or hemoglobin ≥ 8 g/dL in patients with underlying cardiovascular disease.\n"
            "4. In upper GI bleeding: Administer high-dose intravenous Proton Pump Inhibitor (e.g., Pantoprazole 80 mg IV bolus followed by 8 mg/hr continuous infusion) to stabilize mucosal clots.\n"
            "5. In suspected variceal hemorrhage / cirrhotic patients: Administer IV Octreotide (50 mcg bolus followed by 50 mcg/hr infusion) and prophylactic IV Ceftriaxone (1 g/day).\n"
            "6. Perform urgent endoscopy within 24 hours of presentation (or emergent endoscopy once hemodynamically resuscitated) for diagnostic visualization and endoscopic hemostasis."
        )
    },
    {
        "keywords": ["aspirin", "warfarin", "bleeding", "anticoagulant", "antiplatelet", "interaction", "hemorrhage", "inr"],
        "source": "MediGuard Clinical Pharmacological Reference Database",
        "text": (
            "CONTRAINDICATION / WARNING: Co-administration of antiplatelet agents (Aspirin) and oral anticoagulants (Warfarin) "
            "substantially increases the hazard of gastrointestinal and intracranial hemorrhage.\n"
            "Management Directions:\n"
            "- Carefully evaluate the patient's clinical profile to confirm if dual therapy is strictly indicated (e.g., active mechanical heart valve or recent coronary stenting).\n"
            "- Monitor coagulation metrics (PT/INR) frequently, aiming for a tight therapeutic target.\n"
            "- Co-prescribe a proton pump inhibitor (e.g., Omeprazole) to mitigate gastric mucosal bleeding risks.\n"
            "- Instruct the patient to monitor for clinical signs of active bleeding (epistaxis, hematuria, melena, or easy bruising)."
        )
    },
    {
        "keywords": ["metformin", "contrast", "renal", "kidney", "lactic", "acidosis", "egfr", "creatinine"],
        "source": "FDA Clinical Drug Interaction Standards Catalog",
        "text": (
            "WARNING: Metformin co-administration with iodinated contrast media (used during CT scans or angiographies) "
            "presents a high risk of acute renal failure leading to metformin accumulation and fatal Lactic Acidosis.\n"
            "Management Directions:\n"
            "- Withhold Metformin immediately prior to or at the time of the iodinated contrast procedure.\n"
            "- Resume Metformin ONLY after 48 hours post-procedure, provided that renal function (Serum Creatinine / eGFR) "
            "has been re-evaluated and confirmed to be stable in baseline ranges."
        )
    },
    {
        "keywords": ["overdose", "opioid", "naloxone", "hypoventilation", "pinpoint pupils", "respiratory depression", "narcan"],
        "source": "Emergency Toxicology / SAMHSA Guidelines on Acute Opioid Toxicity & Reversal",
        "text": (
            "1. Triage the classic opioid overdose triad: CNS depression / coma, miosis (pinpoint pupils), and respiratory depression (respiratory rate < 10 breaths/min).\n"
            "2. Airway support first: Provide immediate assisted ventilation with a bag-valve-mask (BVM) and supplemental oxygen prior to or alongside antidote delivery.\n"
            "3. Administer Naloxone (Narcan) titrated to restore adequate spontaneous ventilation (goal RR ≥ 12 bpm) rather than full consciousness: Initial dose 0.4 to 2 mg IV/IM/IN.\n"
            "4. Repeat Naloxone every 2 to 3 minutes if respiratory depression persists, up to a cumulative dose of 10 mg.\n"
            "5. Continuous observation: Because Naloxone duration of action (30-90 minutes) is substantially shorter than many opioids (Methadone, Fentanyl patches, extended-release Oxycodone), monitor patient for at least 4 to 6 hours for rebound toxicity.\n"
            "6. Prepare for acute opioid withdrawal syndrome (agitation, vomiting, diaphoresis, piloerection) upon rapid reversal; avoid unnecessary supratherapeutic antagonist boluses."
        )
    },
    {
        "keywords": ["hyperkalemia", "potassium", "peaked t waves", "arrhythmia", "calcium gluconate", "kidney failure", "dialysis"],
        "source": "Renal & Cardiac Emergency Guidelines on Acute Hyperkalemia Management",
        "text": (
            "1. Immediate 12-lead ECG check for electrocardiographic changes: tall peaked T-waves, PR prolongation, flattening of P-waves, QRS widening, or sine-wave pattern indicating imminent cardiac arrest.\n"
            "2. Myocardial membrane stabilization: If ECG changes are present or K+ > 6.5 mEq/L, administer 10% Calcium Gluconate (10-20 mL IV over 5-10 minutes) or Calcium Chloride (10 mL IV through central/large vein). Calcium acts within 1-3 minutes to restore resting membrane potential.\n"
            "3. Intracellular potassium shift: Administer Regular Insulin 10 Units IV accompanied by 50 mL of 50% Dextrose (D50W) over 5 minutes to drive potassium into cells (onset 15-30 min).\n"
            "4. Nebulized Albuterol (10 to 20 mg nebulized over 15 minutes) provides additive intracellular potassium shifting.\n"
            "5. Potassium elimination from the body: Administer IV loop diuretics (Furosemide 40-80 mg IV) if renal function allows, oral gastrointestinal potassium binders (Sodium zirconium cyclosilicate / Patiromer), or arrange emergent hemodialysis for refractory hyperkalemia or anuric ESRD.\n"
            "6. Discontinue all potassium-sparing medications immediately (ACE inhibitors, ARBs, Spironolactone, NSAIDs, potassium supplements)."
        )
    }
]

def search_fallback_kb(query: str) -> list:
    """Performs keyword similarity matches on local reference guidelines for offline safety."""
    query_lower = query.lower().strip()
    results = []
    
    for entry in FALLBACK_KNOWLEDGE_BASE:
        # Check if any keyword matches the search query
        match_score = 0.0
        matched_words = 0
        
        for kw in entry["keywords"]:
            if kw in query_lower:
                matched_words += 1
                
        if matched_words > 0:
            # Calculate a pseudo similarity score based on matched keywords ratio
            match_score = 0.80 + (0.05 * min(matched_words, 4))
            results.append({
                "text": entry["text"],
                "source": entry["source"],
                "score": match_score
            })
            
    # Order matches by pseudo-similarity score DESC
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
