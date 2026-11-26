# ASHA Awaaz — System Architecture & Technical Specifications

**Voice-First Healthcare Register for ASHA Workers in Rural India**  
*Wispr Flow Build for Bharat Hackathon (Round 2 Prototype)*

---

## 1. High-Level Architecture Overview

ASHA Awaaz is an offline-first, voice-native Progressive Web Application (PWA) backed by a high-throughput FastAPI service, deterministic clinical decision engine, and Groq-powered LLM information extraction with dual-layer fallback.

```mermaid
flowchart TD
    subgraph ASHA_Worker["ASHA Worker Field Interaction"]
        Worker(["👩‍⚕️ ASHA Worker"])
        Mic["Natural Voice Input\n(Hindi / Tamil / Hinglish)"]
        TTS["Spoken Confirmation &\nRead-back (TTS)"]
        Worker -->|Speaks naturally| Mic
        TTS -->|Spoken verification| Worker
    end

    subgraph Frontend_PWA["Client Layer (React + Vite PWA)"]
        WSR["Web Speech API\n(hi-IN / ta-IN recognition)"]
        AudioMeter["Web Audio API\nNoise & Volume Meter"]
        Card["Interactive Visit Card"]
        LocalEngine["Local Deterministic Extractor\n(Zero-latency Regex & NLP)"]
        LocalRisk["Local Decision Engine\n(Clinical Danger Rules)"]
        DexieDB[("IndexedDB (Dexie.js)\nLocal Persistent Store")]
        
        Mic --> WSR
        Mic --> AudioMeter
        WSR --> LocalEngine
        LocalEngine --> Card
        Card --> LocalRisk
        LocalRisk --> TTS
        Card -->|Auto-save| DexieDB
    end

    subgraph Cloud_Backend["Backend Layer (FastAPI Service)"]
        API["FastAPI REST Endpoints\n(/extract, /risk-check, /sync)"]
        GroqLLM["Groq API Engine\n(llama-3.3-70b-versatile)"]
        PyFallback["Deterministic Fallback Extractor\n(Medical Dictionary Normalizer)"]
        PyRisk["Deterministic Clinical Risk Engine\n(Danger Thresholds)"]
        MongoStore[("MongoDB Database\n(with In-Memory Fallback)")]

        API --> GroqLLM
        GroqLLM -.->|Fallback on error / no key| PyFallback
        API --> PyRisk
        API --> MongoStore
    end

    DexieDB <-->|Background Sync when Online| API
```

---

## 2. Voice-to-Record Workflow & Confirmation Loop

```mermaid
sequenceDiagram
    autonumber
    actor Worker as ASHA Worker
    participant PWA as ASHA Awaaz PWA
    participant AI as Groq / Fallback Engine
    participant Risk as Clinical Risk Engine
    participant Store as IndexedDB / Backend

    Worker->>PWA: Taps Central Microphone
    PWA->>Worker: Speaks "Namaste, visit ke baare mein boliye."
    Worker->>PWA: Speaks: "Sunita, 7 mahine ki pregnant hai, BP 150/100 hai, pairon mein sujan hai aur iron ki goli nahi li."
    PWA->>AI: Sends Spoken Transcript
    AI-->>PWA: Returns Strict Structured JSON
    PWA->>Risk: Evaluates Danger Signs (BP >= 140/90, Preeclampsia)
    Risk-->>PWA: Danger Flag Triggered + ANM Referral Needed
    PWA->>Worker: Speaks Confirmation: "Sunita, 7 mahine ki garbhvati, BP 150 by 100, pairon mein sujan, iron nahi li. Kya yeh sahi hai?"
    
    alt Worker Confirms
        Worker->>PWA: Speaks "Haan" (or taps Confirm button)
    else Worker Corrects Specific Field
        Worker->>PWA: Speaks "Nahi, BP 140 by 90 hai"
        PWA->>AI: Updates only BP field (preserves all other data)
        PWA->>Worker: Re-reads updated summary
    end

    PWA->>Store: Saves record locally with UUID & Timestamp
    PWA->>Worker: Speaks "Record save ho gaya." + Red Danger Alert Banner
    PWA->>Worker: Shows 1-tap "Call ANM" button & 108 Emergency
```

---

## 3. Clinical Danger Sign Rules (Decision Support)

> [!IMPORTANT]
> The clinical danger engine provides decision support based on public maternal & child health guidelines (MCH / RCH protocols). It never acts as an independent diagnostic agent.

| Condition | Rule Threshold | Danger Flag | Emergency Action | Spoken Alert |
|---|---|---|---|---|
| **Gestational Hypertension** | Pregnant woman with Systolic BP >= 140 OR Diastolic BP >= 90 | `HIGH_BP_PREGNANCY` | Refer to PHC today for immediate clinical assessment | "सावधान! बीपी बढ़ा हुआ है।" |
| **Preeclampsia** | Swelling in feet/limbs + High BP (>= 140/90) | `PREECLAMPSIA_WARNING` | Urgent PHC referral to prevent convulsions | "प्री-एक्लेम्पसिया चेतावनी! तुरंत जांच कराएं।" |
| **Neonatal Sepsis / Fever** | Newborn (<= 60 days) with Temp >= 100.4°F | `NEWBORN_FEVER_DANGER` | Immediate referral to CHC / District Hospital. Keep baby warm. | "नवजात शिशु को तेज बुखार है।" |
| **Fetal Distress** | Absence or sudden reduction in fetal movement | `FETAL_MOVEMENT_DANGER` | Urgent fetal heart sound check and ultrasound | "गर्भ में बच्चे की हलचल बंद/कम है।" |
| **Antepartum Hemorrhage** | Any reported vaginal bleeding during pregnancy | `PREGNANCY_BLEEDING_DANGER` | Call 108 ambulance immediately to First Referral Unit (FRU) | "गंभीर आपातकालीन स्थिति: 108 बुलाएं।" |

---

## 4. Offline Synchronization & Idempotency

1. **Local-First Persistence**: Every visit is committed to IndexedDB (Dexie.js) before any network call is attempted.
2. **Sync Status Machine**:
   - `pending`: Stored on local device, pending cloud replication.
   - `synced`: Successfully confirmed by cloud backend.
   - `failed`: Temporary retry state.
3. **Idempotent Upsert**:
   - Every visit generates a globally unique identifier `visit_id` (e.g. `VISIT_1732661755334_A9F2`).
   - When network restores, the PWA sends a batch to `POST /api/v1/sync`.
   - The backend checks for duplicate `visit_id` and ignores existing records, guaranteeing zero duplication even under repeated retries.
