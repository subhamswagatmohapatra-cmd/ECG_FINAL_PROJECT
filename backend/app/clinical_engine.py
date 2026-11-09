"""
CardioPulse Clinical Decision-Support & Safety Engine
Deterministic, Rule-Based Clinical Triage & Physiological Analysis

REFERENCES & CLINICAL GUIDELINES:
- American Heart Association (AHA) / American College of Cardiology (ACC) Guidelines for Bradycardia and Supraventricular Tachycardia
- European Society of Cardiology (ESC) Guidelines for the Management of Adult Arrhythmias
- Pediatric Advanced Life Support (PALS) Age-Based Vital Signs Standards
- ESC Guidelines on Cardiovascular Diseases during Pregnancy
"""

from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

class ClinicalRuleEngine:
    
    @staticmethod
    def get_age_reference_range(age: Optional[int], is_athlete: bool = False) -> Tuple[int, int, str]:
        """
        Returns (min_bpm, max_bpm, age_bracket_description) based on pediatric & adult clinical guidelines.
        """
        if age is None:
            # Fallback for unknown age: standard adult range with explicit caution
            return (60, 100, "Adult Standard (Age Not Specified)")
        
        if age < 1:
            return (80, 160, "Infant (< 1 yr)")
        elif age <= 3:
            return (80, 130, "Toddler (1-3 yr)")
        elif age <= 5:
            return (80, 120, "Preschool (4-5 yr)")
        elif age <= 12:
            return (70, 110, "School Age (6-12 yr)")
        elif age <= 17:
            return (60, 100, "Adolescent (13-17 yr)")
        elif age < 65:
            if is_athlete:
                return (40, 60, "Conditioned Endurance Athlete (Adult)")
            return (60, 100, "Adult (18-64 yr)")
        else:
            return (55, 95, "Older Adult (65+ yr)")

    @staticmethod
    def evaluate_safety_and_triage(
        bpm: int,
        age: Optional[int],
        resting_status: str,
        symptoms: Optional[Dict[str, Any]],
        medical_history: Optional[Dict[str, Any]],
        medications: Optional[List[Dict[str, Any]]],
        is_pregnant: bool = False,
        recent_illness: bool = False,
        is_athlete: bool = False,
        historical_stats: Optional[Dict[str, Any]] = None,
        hotline: str = "112"
    ) -> Dict[str, Any]:
        """
        Deterministic, safety-first clinical rule evaluator.
        Never overridden by generative AI models.
        """
        symptoms = symptoms or {}
        med_history = medical_history or {}
        meds = medications or []
        
        # 1. Parse Red-Flag Symptoms
        chest_pain = bool(symptoms.get("chest_pain", False))
        stroke_signs = bool(symptoms.get("stroke_signs", False))
        fainting = bool(symptoms.get("fainting_or_syncope", False))
        severe_sob = bool(symptoms.get("severe_shortness_of_breath", False))
        dizziness = bool(symptoms.get("dizziness", False))
        palpitations = bool(symptoms.get("palpitations", False))
        confusion = bool(symptoms.get("confusion", False))
        cold_sweat = bool(symptoms.get("cold_sweat", False))
        
        # 2. Medication checks
        has_beta_blocker = any(
            m.get("affects_heart_rate", False) or 
            any(k in m.get("name", "").lower() for k in ["metoprolol", "atenolol", "bisoprolol", "carvedilol", "propranolol", "diltiazem", "verapamil"])
            for m in meds
        )
        
        # 3. Reference range
        min_ref, max_ref, range_desc = ClinicalRuleEngine.get_age_reference_range(age, is_athlete)
        
        # Adjust for exercise
        is_exercising = resting_status in ["active", "post_exercise"]
        max_predicted_hr = 220 - (age if age else 40)
        target_exercise_min = int(max_predicted_hr * 0.50)
        target_exercise_max = int(max_predicted_hr * 0.85)

        # Contributing physiological factors collection
        contributing_factors = []
        if is_exercising:
            contributing_factors.append(f"Physical exertion (resting status: '{resting_status}'). Expected target exercise zone is {target_exercise_min}–{target_exercise_max} BPM.")
        if is_pregnant:
            contributing_factors.append("Pregnancy increases circulating blood volume and cardiac output, elevating normal resting heart rate by 10–15 BPM.")
        if recent_illness:
            contributing_factors.append("Recent illness or fever stimulates the sympathetic nervous system, typically raising resting heart rate by ~8–10 BPM per °C elevation.")
        if has_beta_blocker:
            contributing_factors.append("Patient is prescribed negative chronotropic medication (e.g. Beta-blocker/CCB), which intentionally reduces resting heart rate.")
        if is_athlete:
            contributing_factors.append("High aerobic conditioning promotes increased stroke volume, yielding normal physiological resting sinus bradycardia.")

        # =====================================================================
        # TIER 1: DETERMINISTIC RED EMERGENCY RULES (Immediate Life Threat)
        # =====================================================================
        
        # Rule R1: Chest pain is an absolute emergency regardless of BPM
        if chest_pain:
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Immediate Medical Evaluation Required for Chest Pain",
                "alert_reason": "Acute chest discomfort reported. Regardless of heart rate (even if normal at {bpm} BPM), acute chest pain can indicate myocardial ischemia, acute coronary syndrome, or pulmonary embolism.",
                "clinical_rationale": "Clinical practice guidelines (ACC/AHA) mandate that acute chest pain with or without abnormal vitals requires immediate emergency medical services (EMS) dispatch to rule out life-threatening cardiac events.",
                "emergency_actions": [
                    f"Call emergency services ({hotline}) or local ambulance immediately.",
                    "Do NOT drive yourself to the emergency department.",
                    "Sit or lie down in a comfortable position with head slightly elevated.",
                    "Loosen tight clothing around your neck and chest.",
                    "If you have prescribed emergency nitroglycerin and were instructed by your doctor, follow your physician's protocol.",
                    "Unlock your front door so emergency responders can enter."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "emergency_chest_pain"
            }

        # Rule R2: Stroke signs
        if stroke_signs:
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Potential Stroke Signs Detected",
                "alert_reason": "Reported symptoms suggest possible acute stroke (FAST: Facial droop, Arm weakness, Speech disturbance).",
                "clinical_rationale": "Acute neurological deficits require hyper-acute evaluation and emergency revascularization within golden therapeutic time windows.",
                "emergency_actions": [
                    f"Call {hotline} or emergency services immediately.",
                    "Note the exact time symptoms first began.",
                    "Do NOT take aspirin unless explicitly told by emergency dispatchers.",
                    "Keep patient calm, lying down on one side if vomiting."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "emergency_stroke"
            }

        # Rule R3: Extreme Tachycardia at rest (>= 150 BPM in adults without strenuous exercise)
        if bpm >= 150 and not is_exercising:
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Severe Resting Tachycardia",
                "alert_reason": f"Heart rate of {bpm} BPM at rest exceeds safe hemodynamic thresholds and may represent Supraventricular Tachycardia (SVT), Atrial Fibrillation with Rapid Ventricular Response (RVR), or Ventricular Tachycardia.",
                "clinical_rationale": "Sustained resting heart rates >= 150 BPM can cause acute hemodynamic compromise, myocardial ischemia, or ventricular arrhythmias.",
                "emergency_actions": [
                    f"Call emergency services ({hotline}) immediately.",
                    "Rest quietly in a supine or seated position.",
                    "Do NOT engage in any physical exertion.",
                    "Have someone stay with you while awaiting emergency personnel."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "severe_tachycardia"
            }

        # Rule R4: Extreme Bradycardia with symptoms (< 38 BPM or < 35 BPM asymptomatic)
        if bpm < 35 or (bpm < 40 and (dizziness or fainting or severe_sob or confusion)):
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Severe Symptomatic Bradycardia",
                "alert_reason": f"Heart rate of {bpm} BPM with neurological/respiratory symptoms indicates severe bradycardia and inadequate cerebral/systemic perfusion.",
                "clinical_rationale": "High-degree AV heart block or sick sinus syndrome can cause sudden cardiac collapse or syncope.",
                "emergency_actions": [
                    f"Call {hotline} or go to the nearest emergency department immediately.",
                    "Lie flat with your legs elevated if feeling faint.",
                    "Do NOT attempt to stand or walk unassisted.",
                    "Avoid sudden movements."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "severe_bradycardia"
            }

        # Rule R5: Fainting (syncope) with abnormal heart rate
        if fainting and (bpm > 110 or bpm < 50):
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Syncope (Fainting) with Dysrhythmic Heart Rate",
                "alert_reason": f"Loss of consciousness (syncope) accompanied by heart rate of {bpm} BPM points to cardiogenic syncope.",
                "clinical_rationale": "Cardiogenic syncope is associated with heightened morbidity and requires immediate 12-lead ECG and continuous telemetry.",
                "emergency_actions": [
                    f"Seek emergency medical evaluation ({hotline}).",
                    "Do NOT drive a motor vehicle or operate heavy machinery.",
                    "Remain seated or reclined until examined by medical personnel."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "cardiogenic_syncope"
            }

        # Rule R6: Severe shortness of breath with tachycardia or bradycardia
        if severe_sob and (bpm > 120 or bpm < 45):
            return {
                "alert_level": "RED",
                "alert_title": "EMERGENCY: Severe Dyspnea with Cardiac Abnormality",
                "alert_reason": f"Severe respiratory distress paired with a heart rate of {bpm} BPM can signal acute decompensated heart failure, pulmonary embolism, or acute arrhythmia.",
                "clinical_rationale": "Concomitant hypoxia and tachycardia indicate impending cardiopulmonary exhaustion.",
                "emergency_actions": [
                    f"Call emergency services ({hotline}) immediately.",
                    "Sit upright in a chair to facilitate lung expansion.",
                    "Do not lie flat if breathing is labored.",
                    "Keep emergency medications and health records accessible."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "severe_dyspnea_cardiac"
            }

        # =====================================================================
        # TIER 2: DETERMINISTIC ORANGE ALERT (Concerning / Prompt Clinical Review)
        # =====================================================================
        
        # Rule O1: Marked resting tachycardia (115 - 149 BPM at rest)
        if bpm >= 115 and not is_exercising:
            return {
                "alert_level": "ORANGE",
                "alert_title": "CONCERNING: Marked Resting Tachycardia",
                "alert_reason": f"Your recorded resting heart rate of {bpm} BPM is significantly elevated above standard adult baseline ({min_ref}–{max_ref} BPM).",
                "clinical_rationale": "Sustained resting rates above 115 BPM warrant prompt clinical evaluation to investigate dehydration, thyroid dysfunction, infection, or cardiac arrhythmias (e.g. atrial flutter/fibrillation).",
                "emergency_actions": [
                    "Contact your healthcare provider or visit an urgent care center promptly today.",
                    "Sit down and rest quietly in a cool environment for 10 minutes.",
                    "Avoid caffeine, nicotine, energy drinks, and decongestant medications.",
                    "If you develop chest pain, dizziness, or shortness of breath, call emergency services immediately."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "marked_tachycardia"
            }

        # Rule O2: Marked resting bradycardia (< 48 BPM in non-athlete without beta-blockers)
        if bpm < 48 and not is_athlete and not has_beta_blocker and not is_exercising:
            return {
                "alert_level": "ORANGE",
                "alert_title": "CONCERNING: Unexplained Marked Resting Bradycardia",
                "alert_reason": f"Resting heart rate of {bpm} BPM is substantially below normal ({min_ref}–{max_ref} BPM) without conditioning or heart-slowing medications.",
                "clinical_rationale": "In non-athletes not taking beta-blockers, resting rates below 48 BPM should be clinically reviewed to evaluate sinus node dysfunction or electrolyte imbalances.",
                "emergency_actions": [
                    "Schedule a clinical evaluation with your doctor within 24 to 48 hours.",
                    "Record symptoms: note if you feel lightheaded, fatigued, or unsteady when standing.",
                    "Do NOT alter any medications without your physician's direct guidance.",
                    "If dizziness or lightheadedness occurs, sit or lie down immediately."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "unexplained_bradycardia"
            }

        # Rule O3: Palpitations combined with dizziness or confusion
        if palpitations and (dizziness or confusion):
            return {
                "alert_level": "ORANGE",
                "alert_title": "CONCERNING: Palpitations with Neurovascular Symptoms",
                "alert_reason": f"Heart rate is {bpm} BPM, but palpitations accompanied by lightheadedness/dizziness suggest brief episodes of hemodynamic alteration.",
                "clinical_rationale": "Palpitations accompanied by presyncope or lightheadedness warrant an outpatient 24-48 hour Holter monitor or cardiology consultation.",
                "emergency_actions": [
                    "Contact your primary care physician or cardiologist for a prompt clinical evaluation.",
                    "Avoid standing suddenly from a sitting or lying position.",
                    "Keep a symptom log noting exact time, duration, and activity during episodes."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "symptomatic_palpitations"
            }

        # Rule O4: High-risk patient with persistent out-of-range HR
        has_cardiac_history = med_history.get("has_heart_disease") or med_history.get("previous_cardiac_event")
        if has_cardiac_history and (bpm > 105 or bpm < 50) and not is_exercising:
            return {
                "alert_level": "ORANGE",
                "alert_title": "CONCERNING: Heart Rate Deviation in Patient with Known Cardiac History",
                "alert_reason": f"Reading of {bpm} BPM in the context of prior cardiovascular history (infarction, stent, or heart disease) requires clinician notification.",
                "clinical_rationale": "Patients with prior coronary artery disease or structural heart disease have lower physiological reserve and heightened risk during sustained rate excursions.",
                "emergency_actions": [
                    "Notify your cardiologist or primary care clinic about this reading.",
                    "Check your blood pressure if you have a home monitor.",
                    "Rest quietly and take repeat measurement in 15 minutes."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "cardiac_history_deviation"
            }

        # =====================================================================
        # TIER 3: DETERMINISTIC YELLOW ALERT (Unusual Trend / Repeat Measurement)
        # =====================================================================
        
        # Rule Y1: Mild resting tachycardia (101 - 114 BPM)
        if 101 <= bpm <= 114 and not is_exercising:
            return {
                "alert_level": "YELLOW",
                "alert_title": "ATTENTION: Mildly Elevated Resting Heart Rate",
                "alert_reason": f"Your resting heart rate of {bpm} BPM is slightly above the typical resting range ({min_ref}–{max_ref} BPM).",
                "clinical_rationale": "Mild elevations are commonly triggered by acute stress, dehydration, caffeine intake, poor sleep, or early viral illness rather than underlying heart disease.",
                "emergency_actions": [
                    "Rest seated quietly for 10–15 minutes, drinking a glass of water.",
                    "Repeat the measurement under calm, resting conditions.",
                    "Observe whether high stress or stimulant consumption (coffee, energy drinks) may be contributing.",
                    "If the elevated rate persists across several days, discuss it with your doctor."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "mild_resting_tachycardia"
            }

        # Rule Y2: Mild resting bradycardia (50 - 59 BPM in non-athlete without beta-blockers)
        if 50 <= bpm < 60 and not is_athlete and not has_beta_blocker and not is_exercising:
            return {
                "alert_level": "YELLOW",
                "alert_title": "ATTENTION: Borderline Low Resting Heart Rate",
                "alert_reason": f"Resting rate of {bpm} BPM is just below the conventional 60 BPM mark.",
                "clinical_rationale": "In healthy individuals with good cardiovascular tone, rates between 50 and 59 BPM are often benign. In the absence of symptoms, watchful monitoring is recommended.",
                "emergency_actions": [
                    "Repeat the measurement later today when fully alert.",
                    "Ensure you are not feeling faint or fatigued.",
                    "Mention this trend at your next routine medical checkup."
                ],
                "expected_min_bpm": min_ref,
                "expected_max_bpm": max_ref,
                "contributing_factors": contributing_factors,
                "triage_category": "mild_resting_bradycardia"
            }

        # Rule Y3: Active exertion with heart rate exceeding 85% max predicted
        if is_exercising and bpm > target_exercise_max:
            return {
                "alert_level": "YELLOW",
                "alert_title": "ATTENTION: Elevated Exercise Heart Rate",
                "alert_reason": f"Heart rate of {bpm} BPM is near or above your estimated vigorous target exercise ceiling ({target_exercise_max} BPM).",
                "clinical_rationale": "Exceeding 85% of age-predicted maximum heart rate during routine workouts may induce excessive anaerobic strain.",
                "emergency_actions": [
                    "Gradually reduce your exercise intensity with a 5-minute cooldown walk.",
                    "Hydrate adequately.",
                    "Do not stop abruptly if you have been exerting strenuously."
                ],
                "expected_min_bpm": target_exercise_min,
                "expected_max_bpm": target_exercise_max,
                "contributing_factors": contributing_factors,
                "triage_category": "elevated_exercise_hr"
            }

        # =====================================================================
        # TIER 4: DETERMINISTIC GREEN ALERT (No Immediate Concern Identified)
        # =====================================================================
        
        return {
            "alert_level": "GREEN",
            "alert_title": "NORMAL: Reading Within Expected Physiological Range",
            "alert_reason": f"Recorded heart rate of {bpm} BPM aligns with age- and activity-appropriate physiological norms ({min_ref}–{max_ref} BPM).",
            "clinical_rationale": f"The measured rate of {bpm} BPM is within the standard reference range for {range_desc} under {resting_status} conditions.",
            "emergency_actions": [
                "Continue routine heart rate monitoring as recommended.",
                "Maintain good hydration, balanced nutrition, and regular restorative sleep.",
                "Seek medical attention if you experience unexpected symptoms such as chest pain or shortness of breath."
            ],
            "expected_min_bpm": min_ref,
            "expected_max_bpm": max_ref,
            "contributing_factors": contributing_factors,
            "triage_category": "normal_physiological"
        }
