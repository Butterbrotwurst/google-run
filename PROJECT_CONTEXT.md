# CityXZ 3D-Modell Generator - Projekt-Kontext

**Letzte Aktualisierung:** 14. Dezember 2025  
**Status:** ✅ Deployed und funktionsfähig

---

## 📋 Projekt-Übersicht

Dieses Projekt ersetzt die Supabase Edge Functions durch einen Google Cloud Run Service, der 3D-GLB-Modelle generiert und in Google Cloud Storage speichert.

### Zweck
- Generierung von 3D-GLB-Modellen basierend auf Adressen/Koordinaten
- Integration mit Shopify für interaktive Karten-Auswahl
- Hochperformante Alternative zu Supabase Edge Functions

---

## 🏗️ Architektur

```
Shopify Liquid Template (address-results.liquid)
    ↓ POST /generate
Google Cloud Run (Node.js + Express)
    ↓ GLB-Generierung
Google Cloud Storage (cityxz-glb-models Bucket)
    ↓ Signed URLs (15 Min TTL)
Shopify Display
```

---

## 🔗 Wichtige URLs & Credentials

### Cloud Run Service
- **URL:** `https://glb-generator-hqx65exeia-ew.a.run.app`
- **Region:** `europe-west1`
- **Service Name:** `glb-generator`

### GitHub Repository
- **URL:** https://github.com/Butterbrotwurst/google-run
- **Owner:** Butterbrotwurst
- **Branch:** main
- **Auto-Deploy:** ✅ Aktiviert (bei jedem Push)

### Google Cloud
- **Project ID:** `fit-coral-475719-k1`
- **Account:** vahidenayati2610@gmail.com
- **Storage Bucket:** `gs://cityxz-glb-models`
- **Bucket Location:** `europe-west1`

### Shopify
- **Template:** `address-results.liquid`
- **Integration:** Cloud Run URL im Schema konfiguriert

---

## 📁 Datei-Struktur

```
cloud-run/
├── server.js                 # Express API Server (POST /generate)
├── package.json              # Node.js Dependencies
├── Dockerfile                # Container-Build-Konfiguration
├── utils/
│   └── glb.js               # GLB-Generierung mit @gltf-transform
├── .dockerignore            # Docker Build Exclusions
├── .gitignore               # Git Exclusions
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions (optional)
├── README.md                # Haupt-Dokumentation
├── DEPLOYMENT.md            # Vollständige Deploy-Anleitung
├── QUICKSTART.md            # 5-Minuten Quick Start
├── ENV_VARIABLES.md         # Umgebungsvariablen Referenz
├── DEPLOY_COMMANDS.sh       # Automatisches Deploy-Script
└── PROJECT_CONTEXT.md       # Diese Datei (für neue Chats)
```

### Shopify Integration
```
address-results.liquid        # Haupt-Template im cityxzbackendserver/
```

---

## 🔧 Technologie-Stack

### Backend
- **Runtime:** Node.js 18
- **Framework:** Express.js
- **3D-Library:** @gltf-transform/core, @gltf-transform/functions
- **Cloud:** Google Cloud Storage SDK

### Infrastructure
- **Hosting:** Google Cloud Run
- **Storage:** Google Cloud Storage
- **CI/CD:** Cloud Build (Auto-Deploy von GitHub)
- **Container:** Docker

---

## ⚙️ Konfiguration

### Umgebungsvariablen (Cloud Run)
```bash
PORT=8080                          # Auto-gesetzt von Cloud Run
BUCKET_NAME=cityxz-glb-models      # GCS Bucket Name
SIGNED_URL_TTL_MIN=15              # Signed URL Ablaufzeit (Minuten)
```

### API Endpoints

#### GET /
Health Check
```bash
curl https://glb-generator-hqx65exeia-ew.a.run.app/
```
Response: `{"status":"ok","service":"glb-generator","version":"1.0.0"}`

#### POST /generate
GLB-Modell erstellen
```bash
curl -X POST https://glb-generator-hqx65exeia-ew.a.run.app/generate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Berlin, Germany",
    "lat": 52.520008,
    "lon": 13.404954,
    "area_km2": 1,
    "size": "medium",
    "dimension": "3d",
    "color": "#2B2B2B",
    "engraving": "none"
  }'
```

Response:
```json
{
  "status": "ok",
  "address": "Berlin, Germany",
  "glb_url": "https://storage.googleapis.com/cityxz-glb-models/...",
  "render_url": "https://storage.googleapis.com/cityxz-glb-models/...",
  "filename": "models/abc123-timestamp.glb",
  "size_bytes": 12345,
  "expires_in_minutes": 15
}
```

---

## 🚀 Deployment-Prozess

### Lokale Änderungen deployen
```bash
cd /Users/vahidenayati/cityxzbackendserver/cloud-run
git add .
git commit -m "Beschreibung der Änderung"
git push origin main
```

**Cloud Build deployt automatisch!** (Dauer: 2-3 Minuten)

### Status überwachen
```bash
# Build-Status
gcloud builds list --limit 5

# Service-Status
gcloud run services describe glb-generator --region europe-west1

# Logs anschauen
gcloud run services logs tail glb-generator --region europe-west1
```

### Cloud Console
- **Cloud Run:** https://console.cloud.google.com/run/detail/europe-west1/glb-generator
- **Cloud Build:** https://console.cloud.google.com/cloud-build/builds
- **Storage:** https://console.cloud.google.com/storage/browser/cityxz-glb-models

---

## 🐛 Bekannte Issues & Lösungen

### Issue 1: `setGenerator is not a function` ✅ GELÖST
**Problem:** glTF-Transform API hatte keine `setGenerator()` Methode  
**Lösung:** Direct property assignment statt Methode
```javascript
// Vorher (Fehler):
document.getRoot().getAsset().setGenerator('CityXZ GLB Generator')

// Nachher (funktioniert):
const asset = document.getRoot().getAsset();
asset.generator = 'CityXZ GLB Generator';
```
**Fix committed:** a2ada58

### Issue 2: Dockerfile fehlt beim ersten Deploy ✅ GELÖST
**Problem:** Cloud Build suchte nach Dockerfile, fand aber keins  
**Lösung:** Dockerfile erstellt und zu GitHub gepusht  
**Status:** Dockerfile existiert jetzt im Repo

### Issue 3: Git Push Konflikte ✅ GELÖST
**Problem:** Divergierende Git-Historien zwischen lokal und GitHub  
**Lösung:** Merge mit `--allow-unrelated-histories`
```bash
git config pull.rebase false
git pull origin main --allow-unrelated-histories
```

### Issue 4: Shopify Schema Default-Wert leer ✅ GELÖST
**Problem:** `cloud_run_url` Default durfte nicht leer sein  
**Lösung:** Default-Wert im Schema eingetragen:
```json
"default": "https://glb-generator-hqx65exeia-ew.a.run.app"
```

---

## 📝 Code-Highlights

### server.js - Haupt-API
```javascript
// POST /generate Endpoint
app.post('/generate', async (req, res) => {
  const { address, lat, lon, color, ... } = req.body;
  
  // GLB generieren
  const glbBuffer = await generateGLB({ color, address });
  
  // Zu GCS hochladen
  await file.save(glbBuffer, { contentType: 'model/gltf-binary' });
  
  // Signed URL generieren (15 Min gültig)
  const [glbSignedUrl] = await file.getSignedUrl({ ... });
  
  res.json({ status: 'ok', glb_url: glbSignedUrl, ... });
});
```

### utils/glb.js - GLB-Generator
```javascript
async function generateGLB(options = {}) {
  const { color = '#2B2B2B', address = 'Unknown' } = options;
  
  // Erstelle 3D-Box mit Farbe
  const document = new Document();
  const material = document.createMaterial('BoxMaterial')
    .setBaseColorFactor([r, g, b, 1.0]);
  
  // ... Geometrie, Mesh, Scene erstellen
  
  // Als GLB exportieren
  const io = new NodeIO();
  return Buffer.from(await io.writeBinary(document));
}
```

### address-results.liquid - Shopify Integration
```javascript
// API Konfiguration
var API = {
  BASE: '{{ section.settings.cloud_run_url | strip | default: "https://glb-generator-hqx65exeia-ew.a.run.app" }}',
  INTERVAL: 3000,
  MAX_ATTEMPTS: 60
};

// GLB generieren
async function generateModel(data) {
  const r = await fetch(api('/generate'), {
    method: 'POST',
    headers: hJson(),
    body: JSON.stringify(data)
  });
  return await r.json();
}
```

---

## 🔄 Workflow

### Nutzer-Flow auf Shopify
1. Nutzer gibt Adresse ein (Google Maps Autocomplete)
2. Nutzer wählt Bereich auf Karte (Quadrat wird gezeichnet)
3. Nutzer klickt "Fertig"
4. JavaScript sendet POST /generate an Cloud Run
5. Cloud Run generiert GLB und speichert in GCS
6. Cloud Run sendet Signed URLs zurück
7. Shopify zeigt "Fertig!" an (Debug Console zeigt Logs)

### Developer-Flow
1. Code lokal ändern
2. `git commit` und `git push`
3. Cloud Build startet automatisch
4. Nach 2-3 Min ist neue Version live
5. Keine manuellen Schritte nötig!

---

## 🧪 Testing

### Lokales Testing
```bash
# Im cloud-run/ Verzeichnis
npm install
export BUCKET_NAME=cityxz-glb-models
export SIGNED_URL_TTL_MIN=15
gcloud auth application-default login
npm start

# In anderem Terminal
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{"address":"Berlin","lat":52.52,"lon":13.4,"color":"#2B2B2B"}'
```

### Production Testing
```bash
# Health Check
curl https://glb-generator-hqx65exeia-ew.a.run.app/

# GLB Generation
curl -X POST https://glb-generator-hqx65exeia-ew.a.run.app/generate \
  -H "Content-Type: application/json" \
  -d '{"address":"Berlin","lat":52.52,"lon":13.4,"color":"#2B2B2B"}'
```

### Shopify Testing
1. Gehe zu Shopify-Seite mit Address Results Section
2. Öffne Browser DevTools (Console)
3. Gebe Adresse ein
4. Klicke "Fertig"
5. Beobachte Debug Console (unten rechts im Overlay)

---

## 📊 Monitoring & Debugging

### Logs ansehen
```bash
# Echtzeit-Logs
gcloud run services logs tail glb-generator --region europe-west1

# Letzte 50 Einträge
gcloud run services logs read glb-generator --region europe-west1 --limit 50

# Nach Fehler filtern
gcloud run services logs read glb-generator --region europe-west1 | grep ERROR
```

### Metrics ansehen
- **Cloud Console:** https://console.cloud.google.com/run/detail/europe-west1/glb-generator/metrics
- **Request Count:** Anzahl API-Aufrufe
- **Latency:** Response-Zeit
- **Error Rate:** Fehlerquote

### Häufige Debug-Schritte
```bash
# 1. Service Status prüfen
gcloud run services describe glb-generator --region europe-west1

# 2. Letzten Build prüfen
gcloud builds list --limit 1

# 3. Build-Logs bei Fehler
BUILD_ID=$(gcloud builds list --limit 1 --format="value(id)")
gcloud builds log $BUILD_ID

# 4. Service neu deployen (force)
gcloud run deploy glb-generator --region europe-west1 --source .
```

---

## 💰 Kosten-Übersicht

### Cloud Run
- **Gratis-Tier:** 2 Millionen Requests/Monat
- **Danach:** ~$0.40 pro Million Requests
- **Memory/CPU:** ~$0.00002400 pro GB-Sekunde
- **Idle:** Keine Kosten bei 0 Requests (Min Instances = 0)

### Cloud Storage
- **Gratis-Tier:** 5 GB Speicher
- **Danach:** ~$0.020 pro GB/Monat
- **Network:** Erste 1GB/Tag kostenlos

### Geschätzte Kosten
- **Low Traffic (<1000 Requests/Monat):** ~$2-5/Monat
- **Medium Traffic (10,000 Requests/Monat):** ~$10-20/Monat
- **High Traffic (100,000 Requests/Monat):** ~$50-100/Monat

---

## 🔐 Sicherheit & Best Practices

### Authentifizierung
- Service ist **öffentlich** zugänglich (allow-unauthenticated)
- Für Production: Rate-Limiting empfohlen
- GCS nutzt Application Default Credentials (keine Keys im Code)

### CORS
- Aktiviert für alle Origins (für Shopify-Integration)
- Bei Bedarf auf spezifische Origins einschränken

### Signed URLs
- 15 Minuten Gültigkeit (konfigurierbar)
- Nach Ablauf: Neues Modell generieren

---

## 📦 Dependencies

### Production Dependencies (package.json)
```json
{
  "express": "^4.18.2",
  "@google-cloud/storage": "^7.7.0",
  "@gltf-transform/core": "^3.10.0",
  "@gltf-transform/functions": "^3.10.0",
  "cors": "^2.8.5"
}
```

### System Requirements
- Node.js >= 18
- npm >= 9

---

## 🎯 Nächste Schritte / Roadmap

### MVP Abgeschlossen ✅
- [x] Cloud Run Service deployed
- [x] GLB-Generierung funktioniert
- [x] GitHub Auto-Deploy aktiviert
- [x] Shopify Integration
- [x] Storage Bucket konfiguriert

### Geplante Verbesserungen
- [ ] Echte 3D-Stadtmodelle (statt simple Box)
  - OpenStreetMap Daten integration
  - Gebäude-Extrusion basierend auf Höhendaten
  - Straßen und Parks als Geometrie
- [ ] PNG Thumbnail-Generierung
  - Für schnelle Preview
  - Vor GLB-Download anzeigen
- [ ] Caching-Layer
  - Wiederholte Requests für gleiche Location
  - Redis oder Cloud Memorystore
- [ ] Rate Limiting
  - Schutz vor Missbrauch
  - Pro IP-Limit
- [ ] Error Notifications
  - Email/Slack bei Fehlern
  - Cloud Monitoring Alerts

---

## 🆘 Hilfe & Support

### Probleme beheben
1. **Service läuft nicht:** Prüfe Cloud Run Status & Logs
2. **Build fehlgeschlagen:** Prüfe Cloud Build Logs
3. **GLB-Fehler:** Prüfe Service Logs für Stack Traces
4. **Shopify zeigt nichts:** Browser Console & Debug Console prüfen

### Nützliche Commands
```bash
# Status-Check-Routine
gcloud run services describe glb-generator --region europe-west1
gcloud builds list --limit 5
gcloud run services logs tail glb-generator --region europe-west1 --limit 20

# Neustart erzwingen
gcloud run services update glb-generator --region europe-west1

# Service löschen (falls Neuanfang nötig)
gcloud run services delete glb-generator --region europe-west1
```

### Wichtige Links
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [glTF-Transform Docs](https://gltf-transform.donmccurdy.com/)
- [Google Cloud Storage Docs](https://cloud.google.com/storage/docs)

---

## 📞 Kontakt & Ownership

**Projekt Owner:** Vahid Enayati  
**Email:** vahidenayati2610@gmail.com  
**GitHub:** Butterbrotwurst  
**Google Cloud:** fit-coral-475719-k1

---

## 🏁 Quick Reference

### Wichtigste Commands
```bash
# Status prüfen
gcloud run services describe glb-generator --region europe-west1

# Code deployen
cd /Users/vahidenayati/cityxzbackendserver/cloud-run
git add . && git commit -m "Update" && git push origin main

# Logs live anschauen
gcloud run services logs tail glb-generator --region europe-west1

# API testen
curl https://glb-generator-hqx65exeia-ew.a.run.app/
```

### Wichtigste URLs
- Service: https://glb-generator-hqx65exeia-ew.a.run.app
- GitHub: https://github.com/Butterbrotwurst/google-run
- Console: https://console.cloud.google.com/run/detail/europe-west1/glb-generator

---

**Diese Datei in neuen Chats anhängen für vollständigen Kontext! 🚀**

