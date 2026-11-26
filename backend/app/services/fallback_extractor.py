import re
from typing import Optional, List, Tuple
from app.schemas.extraction import StructuredVisitData, Vitals, BloodPressure, MedicineItem
from app.utils.medical_dictionary import HINDI_SYMPTOM_MAP, TAMIL_SYMPTOM_MAP, MEDICINE_MAP, CATEGORY_MAP


class DeterministicFallbackExtractor:
    """
    High-accuracy deterministic NLP and regex extractor for Hindi, Hinglish and Tamil.
    Provides reliable, zero-latency extraction without external API calls or credentials.
    """

    def extract(self, transcript: str, language: str = "hi", existing_data: Optional[StructuredVisitData] = None) -> StructuredVisitData:
        text = transcript.strip()
        lower = text.lower()
        
        # Start from existing data if doing a voice correction
        data = existing_data.model_copy(deep=True) if existing_data else StructuredVisitData(original_transcript=text)
        data.original_transcript = text

        # 1. Extract Patient Name
        name = self._extract_name(text, lower)
        if name:
            data.patient_name = name

        # 2. Extract Patient Category
        category = self._extract_category(lower)
        if category and (data.category == "unknown" or category != "unknown"):
            data.category = category

        # 3. Extract Pregnancy Month
        p_month = self._extract_pregnancy_month(lower)
        if p_month:
            data.pregnancy_month = p_month
            if data.category == "unknown":
                data.category = "pregnant_woman"

        # 4. Extract Newborn Age / Child Age
        newborn_days = self._extract_newborn_days(lower)
        if newborn_days is not None:
            data.newborn_age_days = newborn_days
            if data.category == "unknown":
                data.category = "newborn"

        child_years = self._extract_child_years(lower)
        if child_years is not None:
            data.child_age_years = child_years
            if data.category == "unknown":
                data.category = "child"

        # 5. Extract Blood Pressure
        bp = self._extract_blood_pressure(lower)
        if bp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.blood_pressure = bp

        # 6. Extract Weight
        weight = self._extract_weight(lower)
        if weight:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.weight_kg = weight

        # 7. Extract Temperature
        temp = self._extract_temperature(lower)
        if temp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.temperature_f = temp

        # 8. Extract Symptoms
        detected_symptoms = self._extract_symptoms(lower)
        current_symptoms = set(data.symptoms)
        current_symptoms.update(detected_symptoms)
        data.symptoms = sorted(list(current_symptoms))

        # 9. Extract Baby Movement
        movement = self._extract_baby_movement(lower)
        if movement:
            data.baby_movement = movement

        # 10. Extract Medicines
        medicines = self._extract_medicines(lower)
        if medicines:
            # Merge with existing medicines
            existing_med_names = {m.name: m for m in data.medicines}
            for med in medicines:
                existing_med_names[med.name] = med
            data.medicines = list(existing_med_names.values())

        # 11. Determine Missing Fields (based on category)
        missing = []
        if data.category == "pregnant_woman":
            if not (data.vitals and data.vitals.blood_pressure and data.vitals.blood_pressure.systolic):
                missing.append("blood_pressure")
            if not (data.vitals and data.vitals.weight_kg):
                missing.append("weight_kg")
            if data.pregnancy_month is None:
                missing.append("pregnancy_month")
        elif data.category == "newborn":
            if not (data.vitals and data.vitals.temperature_f):
                missing.append("temperature_f")
            if not (data.vitals and data.vitals.weight_kg):
                missing.append("weight_kg")
            if data.newborn_age_days is None:
                missing.append("newborn_age_days")

        data.missing_fields = missing
        data.confidence = 0.92
        return data

    def _extract_name(self, original_text: str, lower_text: str) -> Optional[str]:
        # Pattern like "Sunita, 7 mahine..." or "Namita Devi" or "Patient Sunita"
        # Common prefix stripping
        cleaned = re.sub(r'^(patient|marij|naam|name|shrimati|smt|selvi|thiru)\s*[:=]?\s*', '', original_text, flags=re.IGNORECASE)
        # Check first token before comma or auxiliary verb
        match = re.match(r'^([A-Z\u0900-\u097F\u0B80-\u0BFF][a-zA-Z\u0900-\u097F\u0B80-\u0BFF\s]{1,25}?)(?:,|\s+ko|\s+ka|\s+ki|\s+hai|\s+7|\s+\d|\s+pregnant|\s+navjat|\s+maruthu|\s+avar)', cleaned)
        if match:
            candidate = match.group(1).strip()
            # Avoid picking up numbers or common filler words
            if candidate.lower() not in ["namaste", "visit", "aaj", "ek", "ha", "haan", "nahi"]:
                return candidate
        return None

    def _extract_category(self, text: str) -> Optional[str]:
        for kw, cat in CATEGORY_MAP.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', text) or kw in text:
                return cat
        return None

    def _extract_pregnancy_month(self, text: str) -> Optional[int]:
        # "7 mahine", "saat mahine", "7 month", "7வது மாதம்"
        hindi_numbers = {"ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5, "chhe": 6, "che": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10}
        tamil_numbers = {"ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5, "ஆறு": 6, "ஏழு": 7, "எட்டு": 8, "ஒன்பது": 9}

        # Numeric match
        match = re.search(r'(\d{1,2})\s*(?:mahine|mahina|month|months|வது\s*மாதம்|மாதம்|மாத)', text)
        if match:
            val = int(match.group(1))
            if 1 <= val <= 10:
                return val

        # Word match
        for word, num in {**hindi_numbers, **tamil_numbers}.items():
            if re.search(r'\b' + re.escape(word) + r'\s*(?:mahine|mahina|month|மாதம்|மாத)', text):
                return num
        return None

    def _extract_newborn_days(self, text: str) -> Optional[int]:
        match = re.search(r'(\d{1,3})\s*(?:din|days|naal|நாள்)', text)
        if match:
            return int(match.group(1))
        match_weeks = re.search(r'(\d{1,2})\s*(?:hafte|weeks|வாரம்)', text)
        if match_weeks:
            return int(match_weeks.group(1)) * 7
        return None

    def _extract_child_years(self, text: str) -> Optional[float]:
        match = re.search(r'(\d+(?:\.\d+)?)\s*(?:saal|varsh|years|வயது|ஆண்டு)', text)
        if match:
            return float(match.group(1))
        return None

    def _extract_blood_pressure(self, text: str) -> Optional[BloodPressure]:
        # Matches: "BP 150 by 100", "150/100", "150 100", "bp 140 90"
        patterns = [
            r'(?:bp|blood\s*pressure|rakhtchaap|பிபி)?\s*[:=]?\s*(\d{2,3})\s*(?:/|by|aur|and|bata|\s)\s*(\d{2,3})',
            r'(\d{2,3})\s*/\s*(\d{2,3})'
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                s, d = int(match.group(1)), int(match.group(2))
                if 50 <= s <= 260 and 30 <= d <= 160:
                    return BloodPressure(systolic=s, diastolic=d)
        return None

    def _extract_weight(self, text: str) -> Optional[float]:
        # "vajan 55 kg", "weight 54 kilo", "52 kg", "எடை 50 கிலோ"
        match = re.search(r'(?:weight|vajan|wazan|எடை)?\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|kilo|kilogram|கிலோ)', text)
        if match:
            val = float(match.group(1))
            if 1.0 <= val <= 200.0:
                return val
        return None

    def _extract_temperature(self, text: str) -> Optional[float]:
        # "bukhar 101.5", "temp 100 f", "102 degree", "காய்ச்சல் 101"
        match = re.search(r'(?:bukhar|fever|temperature|temp|காய்ச்சல்)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:degree|f|fahrenheit)?', text)
        if match:
            val = float(match.group(1))
            if 95.0 <= val <= 108.0:
                return val
        return None

    def _extract_symptoms(self, text: str) -> List[str]:
        symptoms = set()
        for kw, sym in HINDI_SYMPTOM_MAP.items():
            if kw in text:
                symptoms.add(sym)
        for kw, sym in TAMIL_SYMPTOM_MAP.items():
            if kw in text:
                symptoms.add(sym)
        return list(symptoms)

    def _extract_baby_movement(self, text: str) -> Optional[str]:
        if any(kw in text for kw in ["halchal nahi", "movement nahi", "bache ki halchal band", "அசைவு இல்லை"]):
            return "none"
        if any(kw in text for kw in ["halchal kam", "movement kam", "அசைவு குறைவு"]):
            return "reduced"
        if any(kw in text for kw in ["halchal theek", "movement theek", "halchal normal", "அசைவு நன்றாக"]):
            return "normal"
        return "unknown"

    def _extract_medicines(self, text: str) -> List[MedicineItem]:
        meds = []
        # Iron tablet check
        if any(w in text for w in ["iron", "ifa", "lal goli", "அயர்ன்"]):
            # Check if missed / not taken
            is_missed = any(neg in text for neg in ["nahi li", "chhut gayi", "nahi khayi", "nahi liya", "சாப்பிடவில்லை", "இல்லை"])
            meds.append(MedicineItem(
                name="iron_tablet",
                status="missed" if is_missed else "taken"
            ))

        # Calcium check
        if any(w in text for w in ["calcium", "safed goli", "கால்சியம்"]):
            is_missed = any(neg in text for neg in ["calcium nahi", "safed goli nahi"])
            meds.append(MedicineItem(
                name="calcium_tablet",
                status="missed" if is_missed else "taken"
            ))
        return meds

    def generate_spoken_summaries(self, data: StructuredVisitData) -> Tuple[str, str]:
        """
        Generates spoken text for text-to-speech confirmation in Hindi and Tamil.
        """
        name = data.patient_name or "मरीज़"
        
        # Hindi summary
        parts_hi = [f"{name}"]
        if data.category == "pregnant_woman" and data.pregnancy_month:
            parts_hi.append(f"{data.pregnancy_month} महीने की गर्भवती")
        elif data.category == "newborn" and data.newborn_age_days:
            parts_hi.append(f"{data.newborn_age_days} दिन का नवजात")

        if data.vitals and data.vitals.blood_pressure and data.vitals.blood_pressure.systolic:
            bp = data.vitals.blood_pressure
            parts_hi.append(f"बीपी {bp.systolic} बाई {bp.diastolic}")

        if data.vitals and data.vitals.temperature_f:
            parts_hi.append(f"बुखार {data.vitals.temperature_f} डिग्री")

        if data.vitals and data.vitals.weight_kg:
            parts_hi.append(f"वजन {data.vitals.weight_kg} किलो")

        if "swelling_in_feet" in data.symptoms:
            parts_hi.append("पैरों में सूजन")
        if "bleeding" in data.symptoms:
            parts_hi.append("रक्तस्राव")
        if "severe_headache" in data.symptoms:
            parts_hi.append("सिर में तेज दर्द")

        for med in data.medicines:
            if med.name == "iron_tablet":
                if med.status == "missed":
                    parts_hi.append("आयरन की गोली नहीं ली")
                else:
                    parts_hi.append("आयरन की गोली ली है")

        summary_hi = ", ".join(parts_hi) + "। क्या यह सही है?"

        # Tamil summary
        name_ta = data.patient_name or "நோயாளி"
        parts_ta = [f"{name_ta}"]
        if data.category == "pregnant_woman" and data.pregnancy_month:
            parts_ta.append(f"{data.pregnancy_month} மாத கர்ப்பிணி")
        if data.vitals and data.vitals.blood_pressure and data.vitals.blood_pressure.systolic:
            bp = data.vitals.blood_pressure
            parts_ta.append(f"பிபி {bp.systolic} / {bp.diastolic}")
        if "swelling_in_feet" in data.symptoms:
            parts_ta.append("கால் வீக்கம்")
        for med in data.medicines:
            if med.name == "iron_tablet" and med.status == "missed":
                parts_ta.append("அயர்ன் மாத்திரை உட்கொள்ளவில்லை")

        summary_ta = ", ".join(parts_ta) + ". இது சரியா?"

        return summary_hi, summary_ta


fallback_extractor = DeterministicFallbackExtractor()
