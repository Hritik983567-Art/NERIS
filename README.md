<<<<<<< HEAD
# NERIS
=======
# 🚛 NERIS — North-East Emergency Transit System
> **AI-Powered Smart Logistics & Accessibility Intelligence Platform for North Eastern India**  
> *Developed for Smart India Hackathon / Bharat Builds Competition*

---

## 🌟 Overview

**NERIS** (North-East Regional Emergency Transit System) is a high-availability, accessibility-focused logistics and emergency corridor management platform specially engineered for the unique geographical and meteorological challenges of the 8 North Eastern Region (NER) states of India (**Assam, Arunachal Pradesh, Meghalaya, Nagaland, Manipur, Mizoram, Tripura, Sikkim**).

Due to extreme terrain, landslides, and heavy monsoon blockades along critical national highways (NH-27, NH-02, NH-06, NH-10, NH-13), standard routing engines fail to account for high-altitude risks. **NERIS** bridges this gap with real-time GIS spatial monitoring, dynamic disaster-penalized route optimization, live vehicle telemetry, and field incident reporting.

---

### ✨ Key Features

1. **🗺️ Interactive GIS Live Map**
   - Real-time tracking of critical freight corridors, active landslides, and flood hazards across all 8 NER states.
   - Dual Day & Night mode GIS tile support with interactive corridor risk index overlays.

2. **⚡ Dynamic AI Route Optimizer**
   - Terrain-aware routing engine calculating steep ghat multipliers, bridge weight tolerances, and disaster penalties.
   - Computes both **Primary Safest Route** and **Secondary Alternate Detour** with cumulative safety scores.

3. **📡 Real-Time Fleet Telemetry & Proximity Alerts**
   - Live GPS tracking for cold-chain vaccine trucks, oxygen tankers, and grain convoys.
   - Automatic geodesic proximity checks (`20 km` threshold) triggering detour alerts when approaching active blockades.

4. **🌐 Multilingual Regional News & Bulletins**
   - Classified disaster warnings, BRO project updates, and tourist advisories.
   - Native parallel translations across **5 North-Eastern languages**:
     - 🇬🇧 English (`en`)
     - 🇮🇳 Assamese / অসমীয়া (`as`)
     - 🇮🇳 Bengali / বাংলা (`bn`)
     - 🇮🇳 Hindi / हिन्दी (`hi`)
     - 🇮🇳 Manipuri / Meitei / ꯃꯩꯇꯩꯂꯣᓐ (`mn`)

5. **📵 Offline Field Sync Protocol**
   - Mobile-first report submission for field officers and BRO personnel operating in zero-connectivity mountain zones.
   - Automatic local storage queueing with cloud auto-sync upon network restoration.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite
- **Mapping & GIS**: Leaflet, React-Leaflet
- **UI & Icons**: Vanilla CSS HSL Design System, Lucide-React, Recharts
- **Localization**: Native 5-Language Parallel Translation Engine
- **Storage**: HTML5 LocalStorage Offline Sync Queue

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/Hritik983567-Art/NERIS.git
cd NERIS/frontend

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

The application will be live on `http://localhost:5173/`.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
>>>>>>> d5f72ea (feat: Initial commit for NERIS - AI-Powered Smart Logistics & Accessibility Intelligence Platform)
