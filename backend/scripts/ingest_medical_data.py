#!/usr/bin/env python3
"""
MediGuard V2 — Medical Knowledge Base Ingestion Pipeline
Seeds 50+ clinically accurate public domain medical documents across 7 categories into Pinecone.
"""

import os
import sys
from langchain_core.documents import Document

# Ensure root package paths are searchable when executing raw scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.ingestion import chunk_documents, embed_and_upsert
from app.utils.logger import get_logger

logger = get_logger("scripts.ingest_medical_data")

# 50 Curated, clinically accurate documents covering cardiovascular, respiratory,
# pharmacology, emergency triage, vitals, icd10, and diagnostics.
MEDICAL_DATASET = [
    # ── Category 1: Cardiovascular (10 documents) ─────────────────
    {
        "topic": "Chest Pain Triage",
        "category": "cardiovascular",
        "content": "Chest pain triage requires rapid differentiation between cardiac and non-cardiac etiologies. Critical indicators of acute coronary syndrome (ACS) include crushing substernal pressure, radiation to the left arm, jaw, or shoulder, associated diaphoresis, dyspnea, and nausea. Non-cardiac chest pain may present as pleuritic, localized, or reproducible upon physical palpation (musculoskeletal), or associated with eating (gastroesophageal reflux disease).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Acute Coronary Syndrome (ACS)",
        "category": "cardiovascular",
        "content": "Acute coronary syndrome (ACS) represents a spectrum of clinical conditions ranging from unstable angina (UA) to non-ST-elevation myocardial infarction (NSTEMI) and ST-elevation myocardial infarction (STEMI). All share a common pathophysiology involving atherosclerotic plaque rupture or erosion leading to coronary artery thrombosis, reducing myocardial blood flow and causing tissue ischemia or necrosis.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "ST-Elevation Myocardial Infarction (STEMI)",
        "category": "cardiovascular",
        "content": "ST-elevation myocardial infarction (STEMI) is characterized by acute myocardial injury with ST-segment elevation on a 12-lead electrocardiogram (ECG) in at least two contiguous leads. STEMI requires immediate emergency reperfusion therapy via primary percutaneous coronary intervention (PCI) within 90 minutes of medical contact, or fibrinolytic therapy if PCI is unavailable, to restore blood flow through the fully occluded coronary artery.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Non-ST-Elevation Myocardial Infarction (NSTEMI)",
        "category": "cardiovascular",
        "content": "Non-ST-elevation myocardial infarction (NSTEMI) presents without acute ST-segment elevation on ECG, but demonstrates elevated cardiac biomarkers (cardiac troponin I or T) signifying myocardial necrosis. ECG changes may include ST-segment depression, T-wave inversion, or no diagnostic changes. Management includes antiplatelet therapy (aspirin, clopidogrel), anticoagulation, and risk-stratified invasive angiographic evaluation.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Stable vs Unstable Angina",
        "category": "cardiovascular",
        "content": "Stable angina is characterized by predictable chest discomfort occurring during physical exertion or emotional stress, resolved promptly by rest or sublingual nitroglycerin. In contrast, unstable angina presents as chest discomfort that is new-onset, occurs at rest, or shows an accelerating pattern (increased frequency, duration, or lower threshold of exertion), representing an impending acute coronary occlusion.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Acute Decompensated Heart Failure",
        "category": "cardiovascular",
        "content": "Acute decompensated heart failure (ADHF) is characterized by a rapid onset of symptoms secondary to abnormal cardiac function. It presents as pulmonary congestion (dyspnea, orthopnea, paroxysmal nocturnal dyspnea, rales) and/or systemic volume overload (peripheral edema, jugular venous distention, hepatic congestion). Initial therapy focuses on preload and afterload reduction using intravenous loop diuretics and vasodilators.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Left-sided vs Right-sided Heart Failure",
        "category": "cardiovascular",
        "content": "Left-sided heart failure leads to pulmonary congestion because the left ventricle cannot pump blood efficiently to the systemic circulation, causing fluid backpressure into the lungs. Symptoms include exertional dyspnea, orthopnea, and rales. Right-sided heart failure typically arises secondary to left-sided failure or pulmonary disease (cor pulmonale), causing fluid backpressure into the systemic venous system, characterized by peripheral edema, jugular venous distention, and ascites.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Atrial Fibrillation (AFib)",
        "category": "cardiovascular",
        "content": "Atrial fibrillation (AFib) is a common supraventricular tachyarrhythmia characterized by disorganized atrial electrical activity leading to an irregular, often rapid ventricular response. AFib causes atrial stasis, significantly increasing the risk of thromboembolic stroke. Management incorporates rate control (beta-blockers, calcium channel blockers), rhythm control (antiarrhythmics, cardioversion), and stroke prevention using systemic anticoagulation (DOACs or warfarin).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Ventricular Tachycardia (VTach)",
        "category": "cardiovascular",
        "content": "Ventricular tachycardia (VTach) is a potentially life-threatening cardiac arrhythmia defined by three or more consecutive premature ventricular complexes originating below the bundle of His at a rate exceeding 100 beats per minute. VTach can rapidly compromise cardiac output, leading to hypotension, syncope, and progression to ventricular fibrillation (VFib) or sudden cardiac arrest. Pulse presence determines immediate treatment (cardioversion vs. defibrillation).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Pericarditis vs Myocarditis",
        "category": "cardiovascular",
        "content": "Pericarditis is an inflammation of the pericardial sac, presenting as sharp, pleuritic chest pain that is characteristically relieved by sitting forward and worsened by lying supine, accompanied by a pericardial friction rub and diffuse ST-segment elevation on ECG. Myocarditis is an inflammation of the myocardium, often viral, presenting with chest pain, heart failure symptoms, elevated troponins, and arrhythmias, mimicking an acute myocardial infarction.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 2: Respiratory (7 documents) ────────────────────
    {
        "topic": "Community-Acquired Pneumonia (CAP)",
        "category": "respiratory",
        "content": "Community-acquired pneumonia (CAP) is an acute infection of the lung parenchyma acquired outside of hospital environments. Common pathogens include Streptococcus pneumoniae, Haemophilus influenzae, and atypical organisms (Mycoplasma pneumoniae). Typical presentation features cough (often productive of purulent sputum), fever, dyspnea, and pleuritic chest pain, with consolidations or infiltrates visible on chest radiography.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Chronic Obstructive Pulmonary Disease (COPD) Exacerbation",
        "category": "respiratory",
        "content": "An acute exacerbation of chronic obstructive pulmonary disease (COPD) is defined as an acute worsening of respiratory symptoms (increased dyspnea, increased sputum volume, and sputum purulence) beyond normal day-to-day variations, requiring additional therapy. Common triggers include viral or bacterial respiratory tract infections. Treatment mainstays include inhaled short-acting bronchodilators, systemic corticosteroids, and oxygen therapy to target SpO2 of 88-92%.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Acute Asthma Bronchospasm",
        "category": "respiratory",
        "content": "Acute asthma exacerbation involves severe bronchospasm, airway hyperresponsiveness, mucosal edema, and mucus plugging, producing variable expiratory airflow obstruction. Clinical signs include wheezing, tachypnea, tachycardia, and accessory muscle use. Initial rescue management prioritizes inhaled short-acting beta-agonists (albuterol) and anticholinergics (ipratropium), combined with systemic corticosteroids to reduce airway inflammation.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Pulmonary Embolism (PE)",
        "category": "respiratory",
        "content": "Pulmonary embolism (PE) is a life-threatening occlusion of the pulmonary arterial bed, most commonly resulting from a thrombus originating in the deep veins of the lower extremities (deep vein thrombosis, DVT). Classic presentation involves sudden-onset dyspnea, pleuritic chest pain, tachypnea, tachycardia, and hypoxemia. Massive PE can cause acute right ventricular strain and obstructive shock. Immediate anticoagulation is crucial.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Deep Vein Thrombosis (DVT)",
        "category": "respiratory",
        "content": "Deep vein thrombosis (DVT) is the formation of one or more blood clots in the deep veins of the body, primarily the lower legs, thighs, or pelvis. Virchow's triad—venous stasis, endothelial injury, and hypercoagulability—outlines DVT risk factors. Symptoms include unilateral leg pain, swelling, warmth, and erythema. DVT carries a high risk of embolization to the lungs (pulmonary embolism).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Pneumothorax",
        "category": "respiratory",
        "content": "Pneumothorax is the presence of air in the pleural space, causing partial or complete collapse of the affected lung. Spontaneous pneumothorax occurs without prior trauma, often in young, tall, thin males (primary) or secondary to underlying lung diseases (COPD, emphysema). Tension pneumothorax is a medical emergency where accumulating air pressure shifts mediastinal structures, compromising venous return and causing obstructive shock.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Acute Respiratory Distress Syndrome (ARDS)",
        "category": "respiratory",
        "content": "Acute respiratory distress syndrome (ARDS) is an acute, diffuse inflammatory lung injury characterized by increased alveolar-capillary permeability, leading to non-cardiogenic pulmonary edema and profound hypoxemia (low PaO2/FiO2 ratio). Triggers include sepsis, severe pneumonia, trauma, and aspiration. Management requires lung-protective mechanical ventilation with low tidal volumes (6 mL/kg) and optimal positive end-expiratory pressure (PEEP).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 3: Pharmacology (10 documents) ──────────────────
    {
        "topic": "Warfarin Pharmacology",
        "category": "pharmacology",
        "content": "Warfarin is an oral anticoagulant that acts as a vitamin K antagonist, inhibiting the synthesis of vitamin K-dependent clotting factors (Factors II, VII, IX, and X) and anticoagulant proteins C and S. It requires close laboratory monitoring of the International Normalized Ratio (INR), with a standard target range of 2.0 to 3.0. Antidotes include Vitamin K (phytonadione) and prothrombin complex concentrate (PCC).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Warfarin and Aspirin Interaction",
        "category": "pharmacology",
        "content": "Co-administration of warfarin and aspirin significantly increases the risk of major bleeding complications (including gastrointestinal and intracranial hemorrhage) without a clear benefit in stroke or ischemic event prevention for most patients. The combination produces synergistic pharmacodynamic effects by combining aspirin's antiplatelet action with warfarin's suppression of coagulation factor synthesis.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Metformin Pharmacology",
        "category": "pharmacology",
        "content": "Metformin is a biguanide oral antihyperglycemic agent used as first-line therapy for type 2 diabetes. It acts primarily by decreasing hepatic glucose production, decreasing intestinal absorption of glucose, and improving insulin sensitivity. Metformin is cleared exclusively by renal excretion and is contraindicated in patients with severe renal impairment (eGFR < 30 mL/min) due to the risk of lactic acidosis.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Metformin and Contrast Media Incompatibility",
        "category": "pharmacology",
        "content": "Administration of iodinated contrast media during imaging studies can cause contrast-induced nephropathy (CIN), causing a rapid decline in renal clearance. If a patient continues metformin during acute kidney injury, the drug accumulates, precipitously increasing the risk of metformin-associated lactic acidosis (MALA), a life-threatening metabolic emergency. Metformin must be held at the time of or prior to contrast procedures and resumed 48 hours later if eGFR remains stable.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Aspirin and Ibuprofen Interaction",
        "category": "pharmacology",
        "content": "Ibuprofen can competitively block the active binding site of cyclooxygenase-1 (COX-1) on platelets, preventing aspirin from irreversibly acetylating the enzyme. This antagonizes aspirin's cardioprotective antiplatelet effect, increasing cardiovascular risks in high-risk patients. When co-administered, aspirin should be taken at least 30 minutes before or 8 hours after taking ibuprofen.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "ACE Inhibitors and ARBs Interaction",
        "category": "pharmacology",
        "content": "Dual blockade of the renin-angiotensin-aldosterone system (RAAS) by combining an ACE Inhibitor (e.g. lisinopril) and an Angiotensin Receptor Blocker (ARB, e.g. losartan) increases the risk of severe hypotension, syncope, hyperkalemia, and acute kidney injury compared to monotherapy. This combination should be avoided, particularly in patients with pre-existing renal impairment or diabetic nephropathy.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Simvastatin and Amlodipine Interaction",
        "category": "pharmacology",
        "content": "Amlodipine is a CYP3A4 inhibitor that can significantly increase systemic exposure to simvastatin, which is metabolized by CYP3A4. This increases the risk of statin-associated muscle toxicities, including myalgias, myopathy, and life-threatening rhabdomyolysis. In patients taking amlodipine, the maximum recommended daily dose of simvastatin is restricted to 20 mg.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Clopidogrel and Omeprazole Interaction",
        "category": "pharmacology",
        "content": "Omeprazole is a moderate CYP2C19 inhibitor that reduces the bioactivation of clopidogrel, a prodrug requiring conversion to its active metabolite by the CYP2C19 isoenzyme. Co-administration decreases clopidogrel's antiplatelet efficacy, potentially increasing the risk of stent thrombosis or recurrent myocardial infarction. Alternative proton pump inhibitors with lower CYP2C19 inhibition, like pantoprazole, are preferred.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Lisinopril Hyperkalemia Risk",
        "category": "pharmacology",
        "content": "Lisinopril blocks the conversion of angiotensin I to angiotensin II, leading to decreased aldosterone secretion. Decreased aldosterone leads to reduced potassium excretion by the kidneys. Lisinopril is associated with hyperkalemia, especially when combined with potassium supplements, potassium-sparing diuretics (spironolactone), or in patients with moderate-to-severe chronic kidney disease.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Penicillin Allergy Cross-Reactivity",
        "category": "pharmacology",
        "content": "Penicillin allergies are frequently reported but often unconfirmed. In patients with verified IgE-mediated immediate hypersensitivity reactions to penicillin (anaphylaxis, bronchospasm, urticaria), there is a small risk of cross-reactivity with cephalosporins due to structural similarities in the beta-lactam ring. First-generation cephalosporins carry a higher cross-reactivity risk (~3-5%) than third- or fourth-generation cephalosporins (<1%).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 4: Emergency Triage (7 documents) ────────────────
    {
        "topic": "Systemic Inflammatory Response Syndrome (SIRS) Criteria",
        "category": "emergency",
        "content": "Systemic Inflammatory Response Syndrome (SIRS) criteria are clinical markers used to screen for systemic inflammation. SIRS is defined by the presence of two or more of the following: 1) Body temperature >38°C (100.4°F) or <36°C (96.8°F); 2) Heart rate >90 beats per minute; 3) Respiratory rate >20 breaths per minute or PaCO2 <32 mmHg; 4) White Blood Cell (WBC) count >12,000/mcL, <4,000/mcL, or >10% immature band forms.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Sepsis and Septic Shock Staging",
        "category": "emergency",
        "content": "Sepsis is defined as life-threatening organ dysfunction caused by a dysregulated host response to infection, clinically identified by an increase in Sequential Organ Failure Assessment (SOFA) score of 2 or more points. Septic shock represents a subset of sepsis characterized by profound circulatory, cellular, and metabolic abnormalities, marked by persistent hypotension requiring vasopressors to maintain MAP >= 65 mmHg and serum lactate > 2 mmol/L despite adequate fluid resuscitation.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Stroke FAST Criteria (Acute Ischemic)",
        "category": "emergency",
        "content": "Stroke FAST criteria are used to rapidly screen for acute ischemic stroke: F - Facial drooping (unilateral facial weakness or numbness); A - Arm weakness (pronator drift or inability to raise one arm); S - Speech difficulty (slurred speech, aphasia, or dysarthria); T - Time to call emergency services. Acute ischemic stroke is a medical emergency requiring rapid neuroimaging to rule out hemorrhage, followed by IV thrombolysis (tPA) within a 3 to 4.5-hour window.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Anaphylaxis Triage & Epinephrine Dosing",
        "category": "emergency",
        "content": "Anaphylaxis is an acute, life-threatening systemic hypersensitivity reaction involving respiratory compromise (bronchospasm, stridor) and/or cardiovascular compromise (hypotension, shock) following exposure to an allergen. First-line therapy is intramuscular (IM) epinephrine injected into the anterolateral thigh (0.3 mg for adults, 0.15 mg for children, concentration 1:1,000). Delaying epinephrine is associated with increased mortality.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Diabetic Ketoacidosis (DKA) Triage",
        "category": "emergency",
        "content": "Diabetic ketoacidosis (DKA) is a life-threatening complication of diabetes characterized by triad: hyperglycemia (blood glucose > 250 mg/dL), systemic ketosis (ketonemia or ketonuria), and metabolic acidosis (arterial pH < 7.30 or bicarbonate < 18 mEq/L). Clinical signs include polyuria, polydipsia, Kussmaul respirations, fruity breath odor, and altered mental status. DKA requires aggressive fluid resuscitation, insulin infusion, and careful potassium management.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Hypertensive Crisis: Emergency vs Urgency",
        "category": "emergency",
        "content": "A hypertensive crisis is defined by a severe elevation in blood pressure, typically systolic BP >180 mmHg and/or diastolic BP >120 mmHg. Hypertensive Emergency is distinguished by the presence of acute, life-threatening target-organ damage (e.g. encephalopathy, acute coronary syndrome, aortic dissection, pulmonary edema, acute renal failure), requiring controlled IV antihypertensive infusion in an ICU setting. Hypertensive Urgency lacks acute target-organ damage and is managed with oral antihypertensive adjustments.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Glasgow Coma Scale (GCS) Staging",
        "category": "emergency",
        "content": "The Glasgow Coma Scale (GCS) evaluates a patient's neurological status based on three parameters: Eye Opening (scores 1-4), Verbal Response (scores 1-5), and Motor Response (scores 1-6). Total GCS scores range from 3 (deep coma or brain death) to 15 (fully awake and alert). GCS score of 8 or less indicates severe brain injury, typically necessitating endotracheal intubation for airway protection ('GCS of 8, intubate').",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 5: Vital Signs (6 documents) ────────────────────
    {
        "topic": "AHA Hypertension Staging",
        "category": "vitals",
        "content": "The American Heart Association (AHA) and American College of Cardiology (ACC) hypertension staging guidelines: 1) Normal: BP < 120/80 mmHg; 2) Elevated: Systolic 120-129 mmHg and Diastolic < 80 mmHg; 3) Stage 1 Hypertension: Systolic 130-139 mmHg or Diastolic 80-89 mmHg; 4) Stage 2 Hypertension: Systolic >= 140 mmHg or Diastolic >= 90 mmHg. Hypertensive Crisis occurs with Systolic >180 and/or Diastolic >120.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Tachycardia Thresholds and Management",
        "category": "vitals",
        "content": "Tachycardia is defined as a resting heart rate exceeding 100 beats per minute. Tachycardia is a physiological response to demand (exercise, anxiety, fever, anemia, shock) or a primary electrical disorder. In clinical triage, persistent tachycardia represents an early sign of shock or cardiovascular decompensation. Management targets the underlying etiology, or in symptomatic unstable tachyarrhythmias, immediate synchronized cardioversion.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Hypoxia and Oxygen Saturation Staging",
        "category": "vitals",
        "content": "Oxygen saturation (SpO2) measures the percentage of hemoglobin binding sites occupied by oxygen. Normal SpO2 ranges from 95% to 100% on room air. Mild hypoxemia is staged at 90-94%, requiring monitoring and supplemental oxygen if symptomatic. Moderate-to-severe hypoxemia (<90%) represents a clinical emergency, requiring rapid supplemental oxygen delivery, diagnostic workup, and potential advanced airway management.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Bradypnea and Tachypnea Thresholds",
        "category": "vitals",
        "content": "Normal resting respiratory rate (RR) in adults ranges from 12 to 20 breaths per minute. Tachypnea is defined as RR > 20 breaths/min, reflecting increased physiological demand, hypoxemia, respiratory disease, or compensation for metabolic acidosis. Bradypnea is defined as RR < 12 breaths/min, commonly caused by central nervous system depression, drug toxicities (opioid overdose), or advanced hypothermia.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Fever and Hyperpyrexia Staging",
        "category": "vitals",
        "content": "Normal core body temperature is typically 37.0°C (98.6°F). Fever (pyrexia) is defined as a core temperature >= 38.0°C (100.4°F), most commonly triggered by infectious pathogens inducing cytokine release. Low-grade fever is 38.0-38.9°C; high-grade fever is 39.0-40.9°C. Hyperpyrexia is a core temperature exceeding 41.0°C (105.8°F), constituting a critical emergency that can lead to permanent neurological damage and multiorgan failure.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Hypotension Staging and Shock Index",
        "category": "vitals",
        "content": "Hypotension is generally defined as blood pressure < 90/60 mmHg, representing inadequate perfusion pressure. Severe hypotension can lead to systemic hypoperfusion (shock). The Shock Index is calculated as Heart Rate divided by Systolic Blood Pressure (HR/SBP). A normal shock index is 0.5 to 0.7. A shock index exceeding 0.9 is a highly sensitive predictor of early systemic hypoperfusion, severe bleeding, or septic shock in triage settings.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 6: ICD-10 Mappings (5 documents) ─────────────────
    {
        "topic": "Essential Hypertension (I10)",
        "category": "icd10",
        "content": "ICD-10 code I10 represents Essential (Primary) Hypertension, which refers to high blood pressure that has no identifiable secondary cause. It is the most common diagnosis code encountered in primary care and cardiovascular clinical environments, accounting for approximately 95% of all clinical hypertension presentations.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Type 2 Diabetes Mellitus (E11.9)",
        "category": "icd10",
        "content": "ICD-10 code E11.9 represents Type 2 Diabetes Mellitus without complications. This code is used for patients with type 2 diabetes whose condition is stable and does not present with acute or chronic macrovascular or microvascular complications (such as nephropathy, neuropathy, or retinopathy) during the evaluation window.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Chest Pain, Unspecified (R07.9)",
        "category": "icd10",
        "content": "ICD-10 code R07.9 represents Chest Pain, Unspecified. This code is frequently used as a temporary or triage diagnosis when a patient presents with acute chest discomfort or pressure, prior to completing definitive diagnostic evaluations (such as serial cardiac troponins, ECGs, or coronary angiograms) to confirm myocardial infarction or angina.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Acute Myocardial Infarction (I21.9)",
        "category": "icd10",
        "content": "ICD-10 code I21.9 represents Acute Myocardial Infarction, Unspecified. This code designates acute myocardial necrosis resulting from sudden coronary artery occlusion. It is utilized when a myocardial infarction is clinically verified by positive biomarkers and ischemia markers, but details regarding STEMI or NSTEMI contiguous wall locations are unspecified.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Heart Failure, Unspecified (I50.9)",
        "category": "icd10",
        "content": "ICD-10 code I50.9 represents Heart Failure, Unspecified. It is used to classify congestive cardiac failure, right-sided heart failure, or left-sided heart failure when clinical documentation does not specify the precise ventricular or hemodynamic classification (e.g. systolic heart failure with reduced ejection fraction, HFrEF).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },

    # ── Category 7: Diagnostics Reference (10 documents) ─────────
    {
        "topic": "Cardiac Troponin I/T Staging",
        "category": "diagnostics",
        "content": "Cardiac troponin I and T are highly sensitive and specific biomarkers of myocardial cellular injury. In the setting of acute coronary syndrome, an elevation in cardiac troponin above the 99th percentile upper reference limit, particularly showing a rising or falling pattern over serial measurements (0, 3, and 6 hours), is diagnostic of acute myocardial infarction.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "D-Dimer Exclusion Cutoffs",
        "category": "diagnostics",
        "content": "D-dimer is a fibrin degradation product, representing a sensitive marker of active coagulation and fibrinolysis. A negative D-dimer test (typically <500 ng/mL FEU) has a high negative predictive value and is used to rule out pulmonary embolism (PE) and deep vein thrombosis (DVT) in patients with a low-to-moderate pre-test probability (Wells Score). Elevated D-dimer is non-specific and occurs in inflammation, trauma, or pregnancy.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Brain Natriuretic Peptide (BNP)",
        "category": "diagnostics",
        "content": "Brain Natriuretic Peptide (BNP) and N-terminal pro-BNP (NT-proBNP) are neurohormones secreted by ventricles in response to volume expansion and pressure overload, causing myocardial wall stretch. BNP levels are elevated in heart failure, serving as a diagnostic marker for acute decompensated heart failure. A BNP < 100 pg/mL has a high negative predictive value for heart failure, while values > 400 pg/mL strongly suggest HF.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Electrocardiogram (ECG) ST-Segment Interpretation",
        "category": "diagnostics",
        "content": "Electrocardiogram (ECG) ST-segment analysis is critical in evaluating acute myocardial ischemia. ST-segment elevation (>= 1 mm in two contiguous leads, or >= 2 mm in precordial leads V2-V3) signifies transmural myocardial injury (STEMI). ST-segment depression (>= 0.5 mm) or T-wave inversion indicates subendocardial ischemia (NSTEMI or unstable angina). Normal ECG does not exclude ischemia.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "White Blood Cell (WBC) Ranges",
        "category": "diagnostics",
        "content": "Normal adult White Blood Cell (WBC) count ranges from 4,000 to 11,000 cells per microliter (/mcL). Leukocytosis (WBC > 11,000/mcL) is a common physiological response to infection, inflammation, severe stress, or tissue necrosis (e.g. myocardial infarction). Leukopenia (WBC < 4,000/mcL) indicates bone marrow suppression, viral infections, or severe septic shock with white cell consumption.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Serum Creatinine and eGFR",
        "category": "diagnostics",
        "content": "Serum creatinine is a waste product of muscle metabolism excreted primarily by glomerular filtration. Normal ranges are typically 0.6 to 1.2 mg/dL. Estimated Glomerular Filtration Rate (eGFR) is calculated using creatinine, age, and sex to assess staging of kidney function. An acute increase in serum creatinine of >= 0.3 mg/dL within 48 hours is diagnostic of Acute Kidney Injury (AKI).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Arterial Blood Gas (ABG) Acid-Base Balance",
        "category": "diagnostics",
        "content": "Arterial Blood Gas (ABG) analysis evaluates pulmonary gas exchange and systemic acid-base status. Normal values: pH 7.35-7.45, PaCO2 35-45 mmHg, HCO3 22-26 mEq/L. Acidosis is a pH < 7.35; alkalosis is a pH > 7.45. Metabolic acidosis (low pH and low HCO3) occurs in lactic acidosis, DKA, or renal failure. Respiratory acidosis (low pH and high PaCO2) occurs in hypoventilation (COPD, severe asthma).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "C-Reactive Protein (CRP)",
        "category": "diagnostics",
        "content": "C-reactive protein (CRP) is an acute-phase reactant synthesized by the liver in response to inflammatory cytokines (especially IL-6). Normal CRP is typically < 3 mg/L. Elevated CRP is a sensitive but non-specific indicator of systemic inflammation, infection, or tissue necrosis, helping monitor the clinical course of inflammatory diseases, sepsis, or rheumatological flare-ups.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "BUN-to-Creatinine Ratio",
        "category": "diagnostics",
        "content": "The Blood Urea Nitrogen (BUN) to Serum Creatinine ratio helps clinically differentiate etiologies of acute kidney injury. A BUN:Creatinine ratio exceeding 20:1 suggests a pre-renal state (hypoperfusion, dehydration, heart failure, GI bleed), where renal tubule urea absorption is selectively increased. A ratio between 10:1 and 15:1 indicates intrinsic renal damage (acute tubular necrosis, ATN).",
        "source": "MediGuard Medical Knowledge Base v2.0"
    },
    {
        "topic": "Hemoglobin A1c",
        "category": "diagnostics",
        "content": "Hemoglobin A1c (HbA1c) represents the percentage of glycated hemoglobin, reflecting average blood glucose exposure over the preceding 2 to 3 months. Normal HbA1c is < 5.7%. Pre-diabetes ranges from 5.7% to 6.4%. A diagnostic HbA1c threshold of >= 6.5% establishes the presence of diabetes mellitus. HbA1c is used to assess glycemic control and guide adjustments in diabetic therapies.",
        "source": "MediGuard Medical Knowledge Base v2.0"
    }
]

def run_ingestion() -> None:
    logger.info("Initializing medical literature dataset ingestion...")
    print(f"Starting ingestion of {len(MEDICAL_DATASET)} curated public-domain clinical reference documents...")
    
    # Translate our structured dictionaries into LangChain Document instances
    langchain_docs = []
    for doc in MEDICAL_DATASET:
        langchain_docs.append(
            Document(
                page_content=doc["content"],
                metadata={
                    "topic": doc["topic"],
                    "category": doc["category"],
                    "source": doc["source"]
                }
            )
        )

    try:
        # Step 1: Chunk documents (uses RecursiveCharacterTextSplitter under the hood)
        chunks = chunk_documents(langchain_docs)
        print(f"Split {len(langchain_docs)} raw documents into {len(chunks)} overlapping text chunks.")
        
        # Step 2: Embed and upsert (uses HuggingFace multilingual-e5-large model and Pinecone index)
        embed_and_upsert(chunks, namespace="medical-kb")
        print("\n\033[92m[SUCCESS] Ingestion pipeline completed successfully! Curated medical knowledge loaded.\033[0m")
        logger.info("Ingestion completed successfully.")
    except Exception as e:
        print(f"\n\033[91m[FAIL] Ingestion pipeline execution failed: {str(e)}\033[0m")
        logger.error("Failed to complete medical literature ingestion pipeline", error=str(e))
        raise e

if __name__ == "__main__":
    run_ingestion()
    sys.exit(0)
