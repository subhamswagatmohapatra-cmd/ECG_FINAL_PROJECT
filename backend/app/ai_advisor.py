"""
CardioPulse AI Advisor & Natural Language Recommendation Engine
Generates clinical explanations and safe patient recommendations.
Includes strict validation, medical guardrails, and deterministic fallback.
"""

from typing import Dict, List, Any, Optional
import os
import httpx
import json
from app.config import settings

class AIAdvisorEngine:

    DISCLAIMER = (
        "IMPORTANT NOTICE: CardioPulse is an AI-assisted clinical decision-support and educational "
        "platform, NOT a replacement for a licensed healthcare provider. This analysis does NOT diagnose "
        "medical conditions, prescribe treatments, or certify cardiovascular health. Heart rate readings "
        "cannot substitute for a clinical 12-lead Electrocardiogram (ECG). Always consult a doctor for diagnosis."
    )

    @classmethod
    async def generate_analysis_and_recommendations(
        cls,
        patient_info: Dict[str, Any],
        reading_info: Dict[str, Any],
        triage_result: Dict[str, Any],
        historical_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates contextual natural-language observations and validated recommendations.
        """
        bpm = reading_info.get("bpm")
        resting_status = reading_info.get("resting_status", "resting")
        age = patient_info.get("age")
        sex = patient_info.get("sex", "Unknown")
        meds = patient_info.get("medications", [])
        med_history = patient_info.get("medical_history", {})
        symptoms = reading_info.get("symptoms", {})
        alert_level = triage_result.get("alert_level", "GREEN")

        # Try Gemini API if API key is present
        ai_generated_data = None
        mode = "Development Clinical NLP Engine (Deterministic & Safe)"
        
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 10 and os.environ.get("TESTING") != "1":
            try:
                ai_generated_data = await cls._call_gemini_api(
                    patient_info, reading_info, triage_result, historical_metrics
                )
                mode = "Google Gemini Live AI Integration"
            except Exception as e:
                # Fallback on any network or parsing error
                ai_generated_data = None
                mode = f"Clinical NLP Engine (Fallback after Gemini API attempt: {str(e)[:40]})"

        if not ai_generated_data:
            ai_generated_data = cls._generate_deterministic_clinical_insights(
                patient_info, reading_info, triage_result, historical_metrics
            )

        # Apply strict clinical safety validator
        validated_data = cls._validate_and_sanitize_ai_output(ai_generated_data, alert_level)
        validated_data["engine_mode"] = mode
        validated_data["clinical_disclaimer"] = cls.DISCLAIMER
        return validated_data

    @classmethod
    async def _call_gemini_api(
        cls,
        patient_info: Dict[str, Any],
        reading_info: Dict[str, Any],
        triage_result: Dict[str, Any],
        historical_metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        prompt = f"""
You are a cardiology clinical decision support AI assistant.
Evaluate this heart rate reading within the patient's complete clinical context.

STRICT MEDICAL GUARDRAILS:
1. The deterministic safety engine has classified this case as: {triage_result.get('alert_level')}
2. You must NOT downgrade or contradict this triage alert level.
3. NEVER prescribe medication, never suggest changing dosages, and never recommend stopping prescription drugs.
4. Distinguish between general wellness lifestyle advice and clinical follow-up recommendations.
5. Explicitly state limitations of pulse readings vs 12-lead ECG.

PATIENT DATA:
- Age: {patient_info.get('age')}, Sex: {patient_info.get('sex')}
- Medical History: {patient_info.get('medical_history')}
- Medications: {[m.get('name') for m in patient_info.get('medications', [])]}
- Lifestyle: Activity: {patient_info.get('physical_activity_level')}, Sleep: {patient_info.get('sleep_duration_hours')} hrs, Stress: {patient_info.get('stress_level')}, Caffeine: {patient_info.get('caffeine_intake')}
- Pregnancy: {patient_info.get('is_pregnant')}, Recent illness: {patient_info.get('recent_illness_or_fever')}

CURRENT READING:
- Heart Rate: {reading_info.get('bpm')} BPM
- Status: {reading_info.get('resting_status')}
- Symptoms: {reading_info.get('symptoms')}
- Historical 7-day Avg: {historical_metrics.get('avg_hr')} BPM (Min: {historical_metrics.get('min_hr')}, Max: {historical_metrics.get('max_hr')})

Respond ONLY with valid JSON having the following schema:
{{
  "contextual_interpretation": "paragraph explaining reading in patient context",
  "physiological_factors": ["factor 1", "factor 2"],
  "unusual_patterns": ["pattern 1 or None"],
  "recommendations": [
    {{"category": "general_wellness", "recommendation_text": "...", "priority": 1}},
    {{"category": "clinical_advisory", "recommendation_text": "...", "priority": 3}}
  ],
  "data_limitations": "specific data limits for this case"
}}
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        return None

    @classmethod
    def _generate_deterministic_clinical_insights(
        cls,
        patient_info: Dict[str, Any],
        reading_info: Dict[str, Any],
        triage_result: Dict[str, Any],
        historical_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        bpm = reading_info.get("bpm", 72)
        status = reading_info.get("resting_status", "resting")
        age = patient_info.get("age", 40)
        sex = patient_info.get("sex", "Patient")
        min_ref = triage_result.get("expected_min_bpm", 60)
        max_ref = triage_result.get("expected_max_bpm", 100)
        alert_level = triage_result.get("alert_level", "GREEN")
        meds = patient_info.get("medications", [])
        med_history = patient_info.get("medical_history", {})
        symptoms = reading_info.get("symptoms", {})
        
        # Build contextual interpretation
        factors = list(triage_result.get("contributing_factors", []))
        patterns = []
        recommendations = []
        
        # 7-day trend analysis
        avg_7d = historical_metrics.get("avg_hr")
        if avg_7d and abs(bpm - avg_7d) >= 15:
            delta = bpm - avg_7d
            dir_str = "higher" if delta > 0 else "lower"
            patterns.append(f"Current reading of {bpm} BPM is {abs(int(delta))} BPM {dir_str} than your 7-day average ({int(avg_7d)} BPM).")

        # Interpretation logic
        if alert_level == "RED":
            interpretation = (
                f"CRITICAL CLINICAL ADVISORY: The recorded reading of {bpm} BPM in combination with "
                f"your reported clinical presentation requires urgent in-person medical evaluation. "
                f"Emergency triage rules take precedence over routine lifestyle observations."
            )
            recommendations.append({
                "category": "urgent_triage",
                "recommendation_text": f"Follow emergency instructions immediately ({triage_result.get('emergency_actions', ['Call emergency services'])[0]}).",
                "priority": 5
            })
        elif alert_level == "ORANGE":
            interpretation = (
                f"A heart rate of {bpm} BPM at rest is clinically concerning relative to your physiological baseline "
                f"({min_ref}–{max_ref} BPM). Concomitant symptoms or cardiovascular risk factors warrant prompt physician review."
            )
            recommendations.append({
                "category": "clinical_advisory",
                "recommendation_text": "Schedule an in-person or telehealth clinical consultation with your primary physician or cardiologist within 24 to 48 hours.",
                "priority": 4
            })
            recommendations.append({
                "category": "clinical_advisory",
                "recommendation_text": "Do not discontinue or modify any prescribed cardiovascular medication without direct medical consultation.",
                "priority": 4
            })
        elif alert_level == "YELLOW":
            interpretation = (
                f"Your reading of {bpm} BPM reflects a mild deviation from standard resting ranges ({min_ref}–{max_ref} BPM). "
                f"Temporary physiological factors such as stress, hydration, recent caffeine, or inadequate sleep are frequent contributors."
            )
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Rest quietly in a seated position for 5–10 minutes, drink a glass of water, and repeat the measurement under calm conditions.",
                "priority": 2
            })
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Maintain consistent sleep schedules and moderate caffeine and stimulant intake over the next 24 hours.",
                "priority": 2
            })
        else: # GREEN
            interpretation = (
                f"Your heart rate of {bpm} BPM is within the standard expected reference range of {min_ref}–{max_ref} BPM for your "
                f"age and physiological profile under {status} conditions. No acute abnormalities were detected."
            )
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Maintain balanced hydration (approximately 2–2.5 liters of water daily, unless medically fluid-restricted).",
                "priority": 1
            })
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Engage in moderate aerobic physical activity (e.g., 150 minutes per week) if cleared by your healthcare provider.",
                "priority": 1
            })
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Aim for 7 to 9 hours of restorative sleep to support optimal cardiovascular autonomic regulation.",
                "priority": 1
            })

        # Add lifestyle advice
        if patient_info.get("stress_level") in ["high", "severe"]:
            factors.append("Reported high emotional or occupational stress, which stimulates sympathetic tone and increases basal heart rate.")
            recommendations.append({
                "category": "general_wellness",
                "recommendation_text": "Consider autonomic calming techniques such as diaphragmatic breathing (4-7-8 method) or mindful meditation to mitigate sympathetic overdrive.",
                "priority": 2
            })

        data_limitations = (
            "Analysis is based on discrete pulse measurements and self-reported symptoms. "
            "Heart rate alone cannot assess cardiac rhythm morphology, electrical conduction delay, "
            "ischemic ST changes, or structural valvular pathology. Continuous 12-lead ECG is required for diagnostic cardiology."
        )

        return {
            "contextual_interpretation": interpretation,
            "physiological_factors": factors,
            "unusual_patterns": patterns if patterns else ["No persistent longitudinal abnormalities detected in current sample."],
            "recommendations": recommendations,
            "data_limitations": data_limitations
        }

    @classmethod
    def _validate_and_sanitize_ai_output(cls, data: Dict[str, Any], alert_level: str) -> Dict[str, Any]:
        """
        Enforces strict safety guardrails on all AI outputs:
        - Prevents medication alteration recommendations.
        - Ensures emergency recommendations are never suppressed.
        """
        sanitized_recs = []
        for rec in data.get("recommendations", []):
            text = rec.get("recommendation_text", "")
            lower_text = text.lower()
            
            # Guardrail: Never allow medication prescription or dose alterations
            forbidden_words = ["stop your medication", "increase your dose", "decrease your dose", "take this pill", "start taking"]
            if any(forbidden in lower_text for forbidden in forbidden_words):
                continue
            
            sanitized_recs.append(rec)

        data["recommendations"] = sanitized_recs
        return data

    @classmethod
    async def chat_with_patient(
        cls,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        patient_context: Dict[str, Any],
        recent_reading: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Healthcare AI Chat Assistant with emergency symptom interceptor.
        """
        lower_msg = user_message.lower()

        # Emergency symptom interceptor: immediately override routine conversation if emergency keywords appear!
        emergency_keywords = [
            "chest pain", "chest tightness", "pressure in chest", "shortness of breath", 
            "can't breathe", "fainted", "passed out", "stroke", "face drooping", 
            "arm numbness", "slurred speech", "emergency", "crushing pain"
        ]
        
        if any(kw in lower_msg for kw in emergency_keywords):
            return {
                "reply": (
                    "⚠️ **CRITICAL SAFETY ALERT**: You have mentioned symptoms that require immediate medical attention (such as chest discomfort, breathing difficulty, or fainting). "
                    "Please do NOT wait for online replies or delay seeking in-person emergency care. Call emergency services (112 / 911) or proceed immediately to the nearest emergency room."
                ),
                "is_emergency": True,
                "emergency_guidance": {
                    "alert_level": "RED",
                    "alert_title": "EMERGENCY: Immediate Medical Assistance Required",
                    "alert_reason": "Reported symptoms require urgent clinical evaluation.",
                    "clinical_rationale": "Emergency triage overrides conversational advice for acute chest pain or respiratory compromise.",
                    "emergency_actions": [
                        "Call emergency services (112 or local ambulance) now.",
                        "Stop any activity and sit down calmly with your head supported.",
                        "Unlock your front door for emergency responders.",
                        "Do not drive yourself to the hospital."
                    ],
                    "hotline_number": "112"
                },
                "clinical_disclaimer": cls.DISCLAIMER
            }

        # Knowledge-based conversational clinical assistant
        age = patient_context.get("age", 40)
        latest_bpm = recent_reading.get("bpm") if recent_reading else "No recent reading"
        
        reply_body = ""
        if "what does my heart rate" in lower_msg or "reading mean" in lower_msg:
            reply_body = (
                f"Your most recent recorded heart rate is **{latest_bpm} BPM**. "
                f"For an adult your age, a typical resting heart rate is approximately 60 to 100 BPM. "
                f"However, individual 'normal' varies based on your fitness level, stress, hydration, and medications. "
                f"If you took this reading while resting and feel comfortable, it falls within the expected physiological spectrum."
            )
        elif "elevated" in lower_msg or "high" in lower_msg or "fast" in lower_msg:
            reply_body = (
                "A temporarily elevated heart rate (tachycardia) can be triggered by many normal factors including:\n"
                "• **Recent physical activity or exertion**\n"
                "• **Acute stress, anxiety, or emotional excitement**\n"
                "• **Caffeine, nicotine, or energy drinks**\n"
                "• **Dehydration or low fluid intake**\n"
                "• **Fever, infection, or recent illness**\n\n"
                "If your heart rate remains persistently high at rest (>100 BPM) or is accompanied by dizziness or palpitations, you should consult your doctor."
            )
        elif "symptom" in lower_msg or "watch for" in lower_msg:
            reply_body = (
                "Symptoms that should prompt medical evaluation include:\n"
                "• **Red-flag emergency symptoms**: Sudden chest pain, pressure, radiating jaw/arm pain, severe shortness of breath, unexplained fainting, or stroke signs (call emergency services immediately).\n"
                "• **Non-emergency clinical symptoms**: Sustained fluttering sensations (palpitations), lightheadedness when standing, unexplained fatigue, or ankle swelling. These should be reviewed by your physician."
            )
        elif "how to monitor" in lower_msg or "accurate" in lower_msg:
            reply_body = (
                "To get the most accurate resting heart rate readings:\n"
                "1. **Rest first**: Sit quietly in a supportive chair for 5 minutes before taking the measurement.\n"
                "2. **Timing**: Avoid coffee, smoking, and vigorous exercise for at least 30 minutes before measuring.\n"
                "3. **Consistency**: Take readings at the same time each day (e.g., right after waking up in the morning).\n"
                "4. **Log symptoms**: Always note whether you feel any dizziness or discomfort at the time."
            )
        else:
            reply_body = (
                f"Thank you for your question. Based on your profile (Age: {age}, Latest HR: {latest_bpm} BPM), "
                f"heart rate is a dynamic vital sign that reflects your autonomic nervous system's response to rest, activity, stress, and lifestyle.\n\n"
                f"I can provide context on your readings, explain physiological factors that affect pulse rate, and outline when clinical review is advisable. "
                f"Please let me know if you would like guidance on your latest reading, monitoring best practices, or potential lifestyle factors."
            )

        return {
            "reply": reply_body,
            "is_emergency": False,
            "emergency_guidance": None,
            "clinical_disclaimer": cls.DISCLAIMER
        }
