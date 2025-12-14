# Was noch zu tun ist

## ✅ Bereits erledigt von mir:

1. ✅ Alle Code-Dateien erstellt
2. ✅ Git Repository initialisiert
3. ✅ Git Commit erstellt
4. ✅ Git Remote zu https://github.com/Butterbrotwurst/google-run.git konfiguriert
5. ✅ Branch zu `main` umbenannt
6. ✅ Shopify `address-results.liquid` mit Cloud Run URL aktualisiert
7. ✅ Deployment-Script erstellt: `DEPLOY_COMMANDS.sh`

## 🔴 Was Sie noch tun müssen:

### 1. GitHub Push (2 Minuten)

Sie müssen sich bei GitHub authentifizieren:

```bash
cd /Users/vahidenayati/cityxzbackendserver/cloud-run

# Option A: Mit Personal Access Token
git push -u origin main
# (Wird nach Username/Password fragen - verwenden Sie Personal Access Token als Password)

# Option B: SSH verwenden (falls konfiguriert)
git remote set-url origin git@github.com:Butterbrotwurst/google-run.git
git push -u origin main
```

**Personal Access Token erstellen:**
- https://github.com/settings/tokens
- "Generate new token (classic)"
- Scope: `repo` aktivieren
- Token kopieren und als Password verwenden

---

### 2. Google Cloud SDK installieren (5 Minuten)

```bash
# macOS mit Homebrew
brew install google-cloud-sdk

# ODER Download von:
# https://cloud.google.com/sdk/docs/install

# Nach Installation:
source ~/.zshrc  # oder ~/.bash_profile
```

---

### 3. Bei Google Cloud anmelden (1 Minute)

```bash
gcloud auth login
```

Dies öffnet Ihren Browser zur Authentifizierung.

---

### 4. Cloud Run Service deployen (5-10 Minuten)

```bash
cd /Users/vahidenayati/cityxzbackendserver/cloud-run
./DEPLOY_COMMANDS.sh
```

**Oder manuell:**

```bash
# Project setzen
gcloud config set project fit-coral-475719-k1

# APIs aktivieren
gcloud services enable run.googleapis.com storage.googleapis.com cloudbuild.googleapis.com

# Bucket erstellen
gcloud storage buckets create gs://cityxz-glb-models \
  --location=europe-west1 \
  --uniform-bucket-level-access

# Deployen
cd /Users/vahidenayati/cityxzbackendserver/cloud-run
gcloud run deploy glb-generator \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars BUCKET_NAME=cityxz-glb-models,SIGNED_URL_TTL_MIN=15
```

---

### 5. Service testen (1 Minute)

```bash
# Service URL abrufen
gcloud run services describe glb-generator \
  --region europe-west1 \
  --format 'value(status.url)'

# Test-Request senden
curl -X POST https://google-run-756442272049.europe-west1.run.app/generate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "Berlin, Germany",
    "lat": 52.520008,
    "lon": 13.404954,
    "color": "#2B2B2B"
  }'
```

---

### 6. Shopify konfigurieren (2 Minuten)

Die URL ist bereits im Code eingetragen: `https://google-run-756442272049.europe-west1.run.app`

**Aber Sie müssen in Shopify noch:**

1. Admin öffnen: https://DEIN-SHOP.myshopify.com/admin
2. Online Store → Themes → Customize
3. Die Seite mit "Address Results" Section öffnen
4. Section Settings öffnen
5. Im Feld "Cloud Run URL" eintragen: `https://google-run-756442272049.europe-west1.run.app`
6. **Speichern!**

---

## 📊 Zusammenfassung

**Geschätzte Zeit insgesamt:** 15-20 Minuten

**Schritte:**
1. ⏳ GitHub Push (braucht Auth)
2. ⏳ gcloud installieren
3. ⏳ gcloud login
4. ⏳ Cloud Run Deploy (automatisch via Script)
5. ⏳ Service testen
6. ⏳ Shopify URL eintragen

**Wichtig:** Ich sehe, dass bereits ein Service unter `https://google-run-756442272049.europe-west1.run.app` läuft. Das neue Deployment wird diesen aktualisieren mit dem neuen Code (GLB Generator).

---

## 🆘 Hilfe

Wenn etwas nicht funktioniert:

```bash
# Status prüfen
gcloud run services list

# Logs anschauen
gcloud run services logs tail glb-generator --region europe-west1

# Service Details
gcloud run services describe glb-generator --region europe-west1
```

