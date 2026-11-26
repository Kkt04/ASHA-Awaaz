"""
Medical Dictionary and Vocabulary Normalization for ASHA Workers
Handles Hindi, Tamil, and Hinglish regional terms for maternal & child healthcare.
"""

# Hindi / Hinglish symptom and condition mappings
HINDI_SYMPTOM_MAP = {
    # Swelling
    "sujan": "swelling_in_feet",
    "pairon mein sujan": "swelling_in_feet",
    "paon mein sujan": "swelling_in_feet",
    "haath pair mein sujan": "swelling_in_limbs",
    "chehre par sujan": "facial_edema",
    "soojhan": "swelling",
    "gor me sujan": "swelling_in_feet",
    "god mein sujan": "swelling_in_feet",
    
    # Blood pressure / dizziness / headache
    "chakkar": "dizziness",
    "sar dard": "severe_headache",
    "sir dard": "severe_headache",
    "sir me dard": "severe_headache",
    "math ghoomat": "dizziness",
    "matha batha": "severe_headache",
    "dhundhla dikhna": "blurred_vision",
    "aankhon ke aage andhera": "blurred_vision",
    
    # Bleeding
    "khoon aana": "bleeding",
    "khoon girna": "bleeding",
    "khoon giral": "bleeding",
    "bleeding hona": "bleeding",
    "raktsrav": "bleeding",
    
    # Fever
    "bukhar": "fever",
    "tez bukhar": "high_fever",
    "shareer garam": "fever",
    "taap": "fever",
    
    # Breathing / Chest
    "saans phoolna": "difficulty_breathing",
    "saans lene mein dikkat": "difficulty_breathing",
    "khansi": "cough",
    "chhati me dard": "chest_pain",
    
    # Abdominal / Gastrointestinal
    "pet dard": "abdominal_pain",
    "tez pet dard": "severe_abdominal_pain",
    "ulti": "vomiting",
    "jee machlana": "nausea",
    "dast": "diarrhea",
    
    # Convulsions
    "daura": "convulsions",
    "jhatke": "convulsions",
    
    # Weakness
    "kamzori": "weakness",
    "thakan": "fatigue",
    "thakawat": "fatigue",
    
    # Baby Movement
    "halchal nahi ho rahi": "no_baby_movement",
    "halchal kam ho gayi": "reduced_baby_movement",
    "bache ki halchal band": "no_baby_movement",
    "bache ki halchal theek hai": "normal_baby_movement",
    "halchal theek hai": "normal_baby_movement",
}

# Tamil symptom and condition mappings
TAMIL_SYMPTOM_MAP = {
    "வீக்கம்": "swelling_in_feet",
    "கால் வீக்கம்": "swelling_in_feet",
    "சுற்றல்": "dizziness",
    "தலைசுற்றல்": "dizziness",
    "தலைவலி": "severe_headache",
    "கடும் தலைவலி": "severe_headache",
    "ரத்தப்போக்கு": "bleeding",
    "காய்ச்சல்": "fever",
    "அதிக காய்ச்சல்": "high_fever",
    "மூச்சுத்திணறல்": "difficulty_breathing",
    "வாந்தி": "vomiting",
    "மயக்கம்": "dizziness",
    "வயிற்று வலி": "abdominal_pain",
    "குழந்தை அசைவு இல்லை": "no_baby_movement",
    "குழந்தை அசைவு குறைவு": "reduced_baby_movement",
    "குழந்தை அசைவு நன்றாக உள்ளது": "normal_baby_movement",
    "சோர்வு": "fatigue",
    "இழுப்பு": "convulsions",
}

# Medicine names
MEDICINE_MAP = {
    "iron": "iron_tablet",
    "iron ki goli": "iron_tablet",
    "ifa": "iron_tablet",
    "lal goli": "iron_tablet",
    "calcium": "calcium_tablet",
    "calcium ki goli": "calcium_tablet",
    "safed goli": "calcium_tablet",
    "folic acid": "folic_acid",
    "paracetamol": "paracetamol",
    "pcm": "paracetamol",
    "albendazole": "deworming_tablet",
    "keede ki dawai": "deworming_tablet",
    "ors": "ors",
    "zinc": "zinc",
    "அயர்ன் மாத்திரை": "iron_tablet",
    "கால்சியம் மாத்திரை": "calcium_tablet",
}

# Category synonyms
CATEGORY_MAP = {
    "pregnant": "pregnant_woman",
    "garbhvati": "pregnant_woman",
    "garbhavastha": "pregnant_woman",
    "pregnancy": "pregnant_woman",
    "maa": "pregnant_woman",
    "aurat": "pregnant_woman",
    "கர்ப்பிணி": "pregnant_woman",
    
    "newborn": "newborn",
    "navjat": "newborn",
    "navjaat": "newborn",
    "chhota bacha": "newborn",
    "chhoti bachi": "newborn",
    "baby": "newborn",
    "shishu": "newborn",
    "பிறந்த குழந்தை": "newborn",
    
    "child": "child",
    "bacha": "child",
    "bachi": "child",
    "balak": "child",
    "குழந்தை": "child",
}
