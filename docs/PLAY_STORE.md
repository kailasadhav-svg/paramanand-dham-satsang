# Play Store app — अजपा संवाद (TWA)

हे वेब अ‍ॅप (`https://satsang.dhyeyapurti.in`) **Trusted Web Activity (TWA)** म्हणून Play Store वर जाते.  
नवीन Android UI लिहायची गरज नाही — Chrome मध्ये तुमची PWA fullscreen चालते.

| Item | Value |
| --- | --- |
| Package ID | `in.dhyeyapurti.satsang` |
| Host | `satsang.dhyeyapurti.in` |
| Start URL | `/` |
| Manifest | `/manifest.webmanifest` |
| Asset links | `/.well-known/assetlinks.json` |

## १) एकदा: signing key

```bash
cd play-store
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -storetype JKS \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload \
  -storepass 'YOUR_STORE_PASSWORD' \
  -keypass 'YOUR_KEY_PASSWORD' \
  -dname "CN=Paramanand Dham Satsang, OU=Dhyeyapurti, O=Dhyeyapurti, L=Nashik, ST=Maharashtra, C=IN"

keytool -list -v -keystore upload-keystore.jks -alias upload -storepass 'YOUR_STORE_PASSWORD' \
  | grep SHA256
```

`keystore.properties.example` → `keystore.properties` copy करून passwords भरा.  
**keystore कधीही git मध्ये commit करू नका.**

SHA-256 घेऊन:

1. `public/.well-known/assetlinks.json` अपडेट करा, **किंवा**
2. Server env: `PLAY_STORE_SHA256_CERT_FINGERPRINTS=AA:BB:...` (comma-separated OK)

Play App Signing वापरत असाल तर Play Console → App signing → **App signing key certificate** चा SHA-256 पण assetlinks मध्ये जोडा.

## २) Asset links live असावेत

Deploy नंतर तपासा:

```bash
curl -sS https://satsang.dhyeyapurti.in/.well-known/assetlinks.json
```

Google चा verifier:

https://developers.google.com/digital-asset-links/tools/generator  
Package: `in.dhyeyapurti.satsang` · Domain: `satsang.dhyeyapurti.in`

## ३) Android project generate + AAB

आवश्यक: JDK 17+, Android SDK, Node.js.

```bash
npm run play:init    # Bubblewrap project → play-store/android (एकदा)
npm run play:build   # app-release-bundle.aab
```

किंवा manual:

```bash
cd play-store
npx @bubblewrap/cli update
npx @bubblewrap/cli build --skipPwaValidation
```

Output साधारणतः:

`play-store/app-release-bundle.aab`

## ४) Play Console

1. [Google Play Console](https://play.google.com/console) → Create app  
2. App name: **अजपा संवाद** (किंवा परमानंद धाम सत्संग)  
3. Free · App · No ads (तुमचे धोरण)  
4. **Production / Testing** → Create release → AAB upload  
5. Store listing: short/full description (मराठी), screenshots (phone), icon 512  
6. Privacy policy URL (आवश्यक) — site वर `/privacy` किंवा help center link  
7. Content rating questionnaire  
8. Target audience / Data safety form  

## ५) काय येणार नाही / येईल

| येईल | येणार नाही (आत्ता) |
| --- | --- |
| Play Store install | Offline-only native UI |
| Push via web (जर नंतर जोडले) | iOS App Store (वेगळे TWA/Capacitor पाऊल) |
| Same login / WhatsApp / attendance | Play-only in-app billing |

## ६) VPS वर asset links deploy

`satsang.service` restart / git pull नंतर:

```bash
curl -sS https://satsang.dhyeyapurti.in/.well-known/assetlinks.json | head
```

Fingerprint चुकीचा असेल तर TWA browser tab मध्ये उघडेल (fullscreen app नाही) — assetlinks fix करा.
