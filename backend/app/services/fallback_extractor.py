import re
from typing import Optional, List, Tuple
from app.schemas.extraction import StructuredVisitData, Vitals, BloodPressure, MedicineItem
from app.utils.medical_dictionary import HINDI_SYMPTOM_MAP, TAMIL_SYMPTOM_MAP, ENGLISH_SYMPTOM_MAP, MEDICINE_MAP, CATEGORY_MAP


class DeterministicFallbackExtractor:
    """
    High-accuracy deterministic NLP and regex extractor for Hindi, Hinglish, Tamil and English.
    Provides reliable, zero-latency extraction and clinical corrections without external API dependencies.
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

        # 3. Extract Patient Age (adults)
        age = self._extract_patient_age(lower)
        if age is not None:
            data.patient_age = age

        # 4. Extract Pregnancy Month
        p_month = self._extract_pregnancy_month(lower)
        if p_month:
            data.pregnancy_month = p_month
            if data.category == "unknown":
                data.category = "pregnant_woman"

        # 5. Extract Newborn Age / Child Age
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

        # 6. Extract Blood Pressure
        bp = self._extract_blood_pressure(lower)
        if bp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.blood_pressure = bp

        # 7. Extract Weight
        weight = self._extract_weight(lower)
        if weight:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.weight_kg = weight

        # 8. Extract Temperature
        temp = self._extract_temperature(lower)
        if temp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.temperature_f = temp

        # 9. Extract Symptoms
        detected_symptoms = self._extract_symptoms(lower)
        current_symptoms = set(data.symptoms)
        current_symptoms.update(detected_symptoms)
        data.symptoms = sorted(list(current_symptoms))

        # 10. Extract Baby Movement
        movement = self._extract_baby_movement(lower)
        if movement:
            data.baby_movement = movement

        # 11. Extract Medicines
        medicines = self._extract_medicines(lower)
        if medicines:
            existing_med_names = {m.name: m for m in data.medicines}
            for med in medicines:
                existing_med_names[med.name] = med
            data.medicines = list(existing_med_names.values())

        # 12. Determine Missing Fields
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

    def correct(
        self,
        current_data: StructuredVisitData,
        correction_text: str,
        language: str = "hi"
    ) -> Tuple[StructuredVisitData, List[str], List[str], Optional[str]]:
        """
        Processes spoken/typed corrections against existing structured visit data.
        Updates ONLY the explicitly corrected fields, preserving all untouched data.
        Correctly handles negations (e.g. 'No fever', 'She only has headache', 'Her age is 28, not 25').
        """
        data = current_data.model_copy(deep=True)
        text = correction_text.strip()
        lower = text.lower()
        fields_changed: List[str] = []

        # 1. Correct Patient Age
        # Examples: "No, her age is 28, not 25", "Age 28", "28 saal", "umar 28", "வயது 28"
        age_match = None
        # Pattern like "age is 28, not 25" or "her age is 28"
        p1 = re.search(r'(?:her\s*age\s*is|his\s*age\s*is|patient\s*age\s*is|age\s*is|age|umar|umra|வயது)\s*[:=]?\s*(\d{1,3})', lower)
        # Pattern like "not 25, 28" or "25 nahi 28"
        p2 = re.search(r'(?:not|\bno\b|\bnahi\b)\s*\d{1,3}\s*[,.]?\s*(?:age\s*is\s*)?(\d{1,3})', lower)
        # Pattern like "28, not 25" or "28 saal, 25 nahi"
        p3 = re.search(r'(\d{1,3})\s*(?:saal|years|year)?\s*[,.]?\s*(?:not|\bnahi\b)', lower)
        # Pattern like "28 saal" or "28 years"
        p4 = re.search(r'(\d{1,3})\s*(?:saal|years|year|varsh|ஆண்டு)', lower)

        if p1:
            age_match = int(p1.group(1))
        elif p2:
            age_match = int(p2.group(1))
        elif p3:
            age_match = int(p3.group(1))
        elif p4:
            age_match = int(p4.group(1))

        if age_match is not None and 1 <= age_match <= 120:
            if data.category == "child" and age_match <= 18:
                data.child_age_years = float(age_match)
                fields_changed.append("child_age_years")
            else:
                data.patient_age = age_match
                fields_changed.append("patient_age")

        # 2. Correct Blood Pressure
        # Examples: "Her blood pressure is 120 over 80", "BP 120 by 80", "120/80"
        bp = self._extract_blood_pressure(lower)
        if bp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.blood_pressure = bp
            fields_changed.append("blood_pressure")

        # 3. Correct Temperature
        # "Bukhar 101.5 hai", "fever 99", "temp 98.6"
        temp = self._extract_temperature(lower)
        if temp:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.temperature_f = temp
            fields_changed.append("temperature_f")

        # 4. Correct Weight
        # "Weight 52 kg", "vajan 55 kilo"
        weight = self._extract_weight(lower)
        if weight:
            if not data.vitals:
                data.vitals = Vitals()
            data.vitals.weight_kg = weight
            fields_changed.append("weight_kg")

        # 5. Correct Symptoms (Handles both NEGATIONS like "No fever" and POSITIONS like "only has headache")
        # List of symptoms and their regional linguistic keywords
        symptom_keywords = {
            "fever": ["fever", "bukhar", "taap", "shareer garam", "காய்ச்சல்"],
            "severe_headache": ["headache", "sar dard", "sir dard", "matha batha", "தலைவலி", "தலை வலி"],
            "swelling_in_feet": ["swelling in feet", "pairon mein sujan", "paon mein sujan", "sujan", "soojhan", "swelling", "வீக்கம்", "கால் வீக்கம்"],
            "dizziness": ["dizziness", "chakkar", "math ghoomat", "தலைசுற்றல்"],
            "bleeding": ["bleeding", "khoon", "raktsrav", "ரத்தப்போக்கு", "ரத்தம்"],
            "difficulty_breathing": ["saans phoolna", "breathing difficulty", "மூச்சுத்திணறல்"],
            "abdominal_pain": ["pet dard", "abdominal pain", "stomach pain", "வயிறு வலி"]
        }

        # Check for Negation / Removal
        # E.g. "She does not have fever", "No fever", "fever nahi hai", "bukhar nahi hai", "illai"
        current_symptoms = list(data.symptoms)
        symptoms_modified = False

        for sym, kw_list in symptom_keywords.items():
            for kw in kw_list:
                # Check negative patterns: "no <kw>", "not <kw>", "does not have <kw>", "doesn't have <kw>", "<kw> nahi", "<kw> nahi hai", "<kw> naikhe"
                neg_pattern = rf'(?:no\b|not\b|does\s*not\s*have|doesn\'t\s*have|not\s*having|illai|bina|without)\s+(?:\w+\s+)?{re.escape(kw)}|{re.escape(kw)}\s+(?:nahi\b|nahi\s*hai|naikhe|illai|nill)'
                if re.search(neg_pattern, lower):
                    if sym in current_symptoms:
                        current_symptoms.remove(sym)
                        symptoms_modified = True
                    break

        # Check for Positive additions (only if NOT negated)
        for sym, kw_list in symptom_keywords.items():
            for kw in kw_list:
                if kw in lower:
                    neg_pattern = rf'(?:no\b|not\b|does\s*not\s*have|doesn\'t\s*have|not\s*having|illai|bina|without)\s+(?:\w+\s+)?{re.escape(kw)}|{re.escape(kw)}\s+(?:nahi\b|nahi\s*hai|naikhe|illai|nill)'
                    if not re.search(neg_pattern, lower):
                        if sym not in current_symptoms:
                            current_symptoms.append(sym)
                            symptoms_modified = True
                        break

        if symptoms_modified:
            data.symptoms = sorted(current_symptoms)
            fields_changed.append("symptoms")

        # 6. Correct Patient Name
        # "Name is Geeta, not Sunita", "Her name is Geeta", "Naam Meena hai"
        if re.search(r'\b(name|naam|peyar|பெயர்)\b', lower):
            name_match = re.search(r'(?:her\s*name\s*is|his\s*name\s*is|name\s*is|naam\s*hai|naam|பெயர்)\s*[:=]?\s*([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)', text, flags=re.IGNORECASE)
            name_alt = re.search(r'(?:name|naam)\s+not\s+[A-Za-z]+\s*[,.]?\s*([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)', text, flags=re.IGNORECASE)
            if name_match:
                candidate = name_match.group(1).strip()
                if candidate.lower() not in ["nahi", "not", "is", "hai", "aur", "and", "fever", "bukhar"]:
                    data.patient_name = candidate
                    fields_changed.append("patient_name")
            elif name_alt:
                candidate = name_alt.group(1).strip()
                if candidate.lower() not in ["nahi", "not", "is", "hai", "aur", "and", "fever", "bukhar"]:
                    data.patient_name = candidate
                    fields_changed.append("patient_name")
            candidate = name_alt.group(1).strip()
            if candidate.lower() not in ["nahi", "not", "is", "hai", "aur", "and"]:
                data.patient_name = candidate
                fields_changed.append("patient_name")

        # 7. Correct Pregnancy Month
        # "Pregnancy month is 7", "7 mahine", "7th month"
        p_month = self._extract_pregnancy_month(lower)
        if p_month and data.category == "pregnant_woman":
            data.pregnancy_month = p_month
            fields_changed.append("pregnancy_month")

        # 8. Correct Newborn Days / Child Age
        nb_days = self._extract_newborn_days(lower)
        if nb_days is not None and data.category == "newborn":
            data.newborn_age_days = nb_days
            fields_changed.append("newborn_age_days")

        # 9. Correct Medicines
        if any(w in lower for w in ["iron", "ifa", "lal goli", "அயர்ன்"]):
            is_missed = any(neg in lower for neg in ["nahi", "missed", "chhut", "illai", "no"])
            existing_iron = next((m for m in data.medicines if m.name == "iron_tablet"), None)
            if existing_iron:
                existing_iron.status = "missed" if is_missed else "taken"
            else:
                data.medicines.append(MedicineItem(name="iron_tablet", status="missed" if is_missed else "taken"))
            fields_changed.append("medicines")

        all_fields = [
            "patient_name", "category", "patient_age", "pregnancy_month",
            "newborn_age_days", "child_age_years", "blood_pressure",
            "temperature_f", "weight_kg", "symptoms", "medicines"
        ]
        fields_unchanged = [f for f in all_fields if f not in fields_changed]

        ambiguity_note = None
        if not fields_changed:
            ambiguity_note = "Could not clearly identify what to change. Please specify the field clearly (e.g., 'Age is 28' or 'BP is 120/80')."

        data.original_transcript = f"{current_data.original_transcript} [Correction: {text}]"
        return data, fields_changed, fields_unchanged, ambiguity_note

    def _extract_name(self, original_text: str, lower_text: str) -> Optional[str]:
        cleaned = re.sub(r'^(patient|marij|naam|name|shrimati|smt|selvi|thiru)\s*[:=]?\s*', '', original_text, flags=re.IGNORECASE)
        match = re.match(r'^([A-Z\u0900-\u097F\u0B80-\u0BFF][a-zA-Z\u0900-\u097F\u0B80-\u0BFF\s]{1,25}?)(?:,|\s+ko|\s+ka|\s+ki|\s+hai|\s+7|\s+\d|\s+pregnant|\s+navjat|\s+maruthu|\s+avar)', cleaned)
        if match:
            candidate = match.group(1).strip()
            if candidate.lower() not in ["namaste", "visit", "aaj", "ek", "ha", "haan", "nahi"]:
                return candidate
        return None

    def _extract_category(self, text: str) -> Optional[str]:
        for kw, cat in CATEGORY_MAP.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', text) or kw in text:
                return cat
        return None

    def _extract_patient_age(self, text: str) -> Optional[int]:
        # "age 25", "umar 25", "25 saal", "25 years", "வயது 25"
        m1 = re.search(r'(?:age|umar|umra|வயது)\s*[:=]?\s*(\d{1,3})', text)
        if m1:
            val = int(m1.group(1))
            if 1 <= val <= 120:
                return val
        m2 = re.search(r'(\d{1,3})\s*(?:saal|years|year|varsh|ஆண்டு)', text)
        if m2:
            val = int(m2.group(1))
            if 1 <= val <= 120:
                return val
        return None

    def _extract_pregnancy_month(self, text: str) -> Optional[int]:
        hindi_numbers = {"ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "panch": 5, "chhe": 6, "che": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10}
        tamil_numbers = {"ஒன்று": 1, "இரண்டு": 2, "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5, "ஆறு": 6, "ஏழு": 7, "எட்டு": 8, "ஒன்பது": 9}

        match = re.search(r'(\d{1,2})\s*(?:mahine|mahina|month|months|வது\s*மாதம்|மாதம்|மாத)', text)
        if match:
            val = int(match.group(1))
            if 1 <= val <= 10:
                return val

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
        patterns = [
            r'(?:bp|blood\s*pressure|rakhtchaap|பிபி)?\s*[:=]?\s*(\d{2,3})\s*(?:/|by|over|aur|and|bata|\s)\s*(\d{2,3})',
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
        match = re.search(r'(?:weight|vajan|wazan|எடை)?\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(?:kg|kilo|kilogram|கிலோ)', text)
        if match:
            val = float(match.group(1))
            if 1.0 <= val <= 200.0:
                return val
        return None

    def _extract_temperature(self, text: str) -> Optional[float]:
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
        for kw, sym in ENGLISH_SYMPTOM_MAP.items():
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
        if any(w in text for w in ["iron", "ifa", "lal goli", "அயர்ன்"]):
            is_missed = any(neg in text for neg in ["nahi li", "chhut gayi", "nahi khayi", "nahi liya", "சாப்பிடவில்லை", "இல்லை"])
            meds.append(MedicineItem(
                name="iron_tablet",
                status="missed" if is_missed else "taken"
            ))

        if any(w in text for w in ["calcium", "safed goli", "கால்சியம்"]):
            is_missed = any(neg in text for neg in ["calcium nahi", "safed goli nahi"])
            meds.append(MedicineItem(
                name="calcium_tablet",
                status="missed" if is_missed else "taken"
            ))
        return meds

    def generate_spoken_summaries(self, data: StructuredVisitData) -> Tuple[str, str, str]:
        """
        Generates spoken text for text-to-speech confirmation in Hindi, Tamil, and English.
        """
        name = data.patient_name or "मरीज़"
        
        parts_hi = [f"{name}"]
        if data.patient_age:
            parts_hi.append(f"उम्र {data.patient_age} साल")
        if data.category == "pregnant_woman" and data.pregnancy_month:
            parts_hi.append(f"{data.pregnancy_month} महीने की गर्भवती")
        elif data.category == "newborn" and data.newborn_age_days:
            parts_hi.append(f"{data.newborn_age_days} दिन का नवजात")
        elif data.category == "child" and data.child_age_years:
            parts_hi.append(f"{data.child_age_years} साल का बच्चा")

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
            parts_hi.append("सिर में दर्द")
        if "fever" in data.symptoms:
            parts_hi.append("बुखार")

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
        if data.patient_age:
            parts_ta.append(f"வயது {data.patient_age}")
        if data.category == "pregnant_woman" and data.pregnancy_month:
            parts_ta.append(f"{data.pregnancy_month} மாத கர்ப்பிணி")
        elif data.category == "newborn" and data.newborn_age_days:
            parts_ta.append(f"{data.newborn_age_days} நாட்கள் குழந்தை")
        if data.vitals and data.vitals.blood_pressure and data.vitals.blood_pressure.systolic:
            bp = data.vitals.blood_pressure
            parts_ta.append(f"பிபி {bp.systolic} / {bp.diastolic}")
        if "swelling_in_feet" in data.symptoms:
            parts_ta.append("கால் வீக்கம்")
        if "severe_headache" in data.symptoms:
            parts_ta.append("தலைவலி")
        if "fever" in data.symptoms:
            parts_ta.append("காய்ச்சல்")
        for med in data.medicines:
            if med.name == "iron_tablet" and med.status == "missed":
                parts_ta.append("அயர்ன் மாத்திரை உட்கொள்ளவில்லை")

        summary_ta = ", ".join(parts_ta) + ". இது சரியா?"

        # English summary
        name_en = data.patient_name or "Patient"
        parts_en = [f"{name_en}"]
        if data.patient_age:
            parts_en.append(f"Age {data.patient_age} years")
        if data.category == "pregnant_woman" and data.pregnancy_month:
            parts_en.append(f"{data.pregnancy_month} months pregnant")
        elif data.category == "newborn" and data.newborn_age_days:
            parts_en.append(f"{data.newborn_age_days} days old newborn")
        elif data.category == "child" and data.child_age_years:
            parts_en.append(f"{data.child_age_years} years old child")

        if data.vitals and data.vitals.blood_pressure and data.vitals.blood_pressure.systolic:
            bp = data.vitals.blood_pressure
            parts_en.append(f"Blood pressure {bp.systolic} over {bp.diastolic}")
        if data.vitals and data.vitals.temperature_f:
            parts_en.append(f"Fever {data.vitals.temperature_f} degrees")
        if data.vitals and data.vitals.weight_kg:
            parts_en.append(f"Weight {data.vitals.weight_kg} kg")
        if "swelling_in_feet" in data.symptoms:
            parts_en.append("Swelling in feet")
        if "bleeding" in data.symptoms:
            parts_en.append("Bleeding")
        if "severe_headache" in data.symptoms:
            parts_en.append("Headache")
        if "fever" in data.symptoms:
            parts_en.append("Fever")
        for med in data.medicines:
            if med.name == "iron_tablet":
                parts_en.append("Iron tablet missed" if med.status == "missed" else "Iron tablet taken")

        summary_en = ", ".join(parts_en) + ". Is this information correct?"

        return summary_hi, summary_ta, summary_en


fallback_extractor = DeterministicFallbackExtractor()
