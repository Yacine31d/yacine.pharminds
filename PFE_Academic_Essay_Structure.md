# 📄 PFE Academic Essay Structure — PharMinds Algeria

> **University Final Year Project (Projet de Fin d'Études)**  
> This document provides the full structure, section contents, and a ready-to-use Claude prompt for generating the complete academic essay.

---

## ══════════════════════════════════════
## 🏷️ TITLE PAGE
## ══════════════════════════════════════

```
UNIVERSITÉ / ÉCOLE SUPÉRIEURE [Votre Établissement]
Département Informatique / Génie Logiciel

───────────────────────────────────────────────
MÉMOIRE DE FIN D'ÉTUDES
Pour l'obtention du diplôme de Master en [Informatique / Génie Logiciel / IA]
───────────────────────────────────────────────

TITRE :
PharMinds : Conception et Développement d'une Plateforme Intelligente de
Gestion Pharmaceutique avec OCR Médical et Détection d'Interactions
Médicamenteuses par Intelligence Artificielle pour le Contexte Algérien

───────────────────────────────────────────────

Présenté par : [Votre Nom Complet]
Encadré par  : [Nom de l'Encadrant], [Grade]
Année Universitaire : 2025 / 2026
```

---

## ══════════════════════════════════════
## 📋 RÉSUMÉ / ABSTRACT
## ══════════════════════════════════════

### 🇫🇷 Résumé (Français)

> **[~250 mots]**
>
> La gestion des prescriptions médicales et la surveillance des interactions médicamenteuses constituent des défis majeurs dans le système de santé algérien. Ce mémoire présente **PharMinds**, une plateforme web intelligente conçue pour moderniser le processus pharmaceutique en combinant les technologies web modernes, l'intelligence artificielle et la reconnaissance optique de caractères (OCR).
>
> La plateforme s'articule autour de trois acteurs principaux : les **patients**, qui peuvent gérer numériquement leurs ordonnances et leur Carte Chifa ; les **pharmaciens**, qui bénéficient d'un système temps réel de vérification des interactions médicamenteuses et d'un scanner intelligent d'ordonnances ; et les **administrateurs**, qui supervisent l'ensemble du système à l'échelle nationale.
>
> Le cœur technique du projet repose sur un modèle OCR fine-tuné, **TrOCR** de Microsoft (architecture Vision Encoder-Decoder basée sur les Transformers), entraîné sur un dataset synthétique de 8 000 images de lignes de prescription algériennes générées spécifiquement pour ce contexte (médicaments en français, posologies courantes). La détection de texte utilise l'algorithme **CRAFT** via EasyOCR, tandis que la reconnaissance est assurée par le modèle fine-tuné servi via **FastAPI**.
>
> Le frontend est développé en **React 18 + TypeScript + Vite**, le backend repose sur **Supabase** (PostgreSQL + Edge Functions Deno) et l'assistant IA PharmaAssist est alimenté par l'API **Google Gemini**. Une base de données de médicaments algériens et de leurs interactions est intégrée, permettant des alertes en temps réel par sévérité (majeure, modérée, mineure).
>
> Les résultats préliminaires démontrent la viabilité de l'approche et ouvrent des perspectives prometteuses pour l'amélioration de la sécurité médicamenteuse en Algérie.
>
> **Mots-clés :** OCR, TrOCR, Interactions Médicamenteuses, Gestion Pharmaceutique, React, Supabase, Deep Learning, Algérie, IA Médicale

---

### 🇬🇧 Abstract (English)

> **[~250 words]**
>
> Managing medical prescriptions and monitoring drug interactions represent major challenges within the Algerian healthcare system. This thesis presents **PharMinds**, an intelligent web platform designed to modernize pharmaceutical workflows by combining modern web technologies, artificial intelligence, and Optical Character Recognition (OCR).
>
> The platform serves three types of stakeholders: **patients**, who can digitally manage their prescriptions and Carte Chifa health insurance cards; **pharmacists**, who benefit from a real-time drug interaction verification system and an intelligent prescription scanner; and **administrators**, who oversee the entire system at a national level.
>
> The technical core of this project relies on a fine-tuned OCR model — Microsoft's **TrOCR** (a Vision Encoder-Decoder Transformer architecture) — trained on a synthetic dataset of 8,000 Algerian prescription line images. Text detection leverages the **CRAFT** algorithm via EasyOCR, while recognition is handled by the fine-tuned model served through a local **FastAPI** microservice.
>
> The frontend is built with **React 18 + TypeScript + Vite**, the backend is powered by **Supabase** (PostgreSQL + Deno Edge Functions), and the PharmaAssist AI chatbot is driven by the **Google Gemini API**. An Algerian drugs and interactions database enables real-time severity-classified alerts (major, moderate, minor).
>
> Preliminary results demonstrate the feasibility of the approach and open promising perspectives for improving drug safety in Algeria.
>
> **Keywords:** OCR, TrOCR, Drug Interaction Detection, Pharmaceutical Management, React, Supabase, Deep Learning, Algeria, Medical AI

---

## ══════════════════════════════════════
## 📑 TABLE OF CONTENTS (Structure)
## ══════════════════════════════════════

```text
Liste des Figures
Liste des Tableaux
Liste des Abréviations

1. Introduction Générale
   1.1 Contexte et Problématique
   1.2 Objectifs du Projet
   1.3 Périmètre et Limites
   1.4 Organisation du Mémoire

2. État de l'Art
   2.1 Systèmes de Gestion Pharmaceutique Existants
   2.2 OCR Médical : État de l'Art
   2.3 Détection Automatique des Interactions Médicamenteuses
   2.4 Plateformes Cloud et BaaS
   2.5 Synthèse et Positionnement du Projet

3. Analyse des Besoins
   3.1 Étude du Domaine
   3.2 Identification des Acteurs
   3.3 Besoins Fonctionnels (Use Cases)
   3.4 Besoins Non-Fonctionnels
   3.5 Cas d'Utilisation (Diagrammes UML)

4. Conception et Architecture
   4.1 Architecture Globale du Système
   4.2 Architecture Frontend (React + TypeScript)
   4.3 Architecture Backend (Supabase / PostgreSQL)
   4.4 Architecture du Microservice OCR (FastAPI + TrOCR)
   4.5 Modèle de Données (Schéma de Base de Données)
   4.6 Flux de Données (Diagrammes de Séquence)
   4.7 Résilience : Architecture Multi-Cloud et Failover Automatique

5. Implémentation du Modèle OCR
   5.1 Choix du Modèle : TrOCR (Microsoft)
   5.2 Génération du Dataset Synthétique Algérien
   5.3 Annotation Automatique par API Gemini
   5.4 Pipeline de Fine-Tuning
   5.5 Architecture du Pipeline de Reconnaissance
   5.6 Déploiement via FastAPI

6. Implémentation de la Plateforme Web
   6.1 Module Patient
   6.2 Module Pharmacien
   6.3 Module Administration
   6.4 Module IA (PharmaAssist + Scan d'Ordonnances)
   6.5 Sécurité et Gestion des Rôles (RLS Supabase)

7. Tests et Évaluation
   7.1 Plan de Tests
   7.2 Métriques d'Évaluation OCR (CER / WER)
   7.3 Tests Fonctionnels de la Plateforme
   7.4 Tests de Performance
   7.5 Discussion des Résultats

8. Conclusion Générale et Perspectives
   8.1 Bilan du Travail Réalisé
   8.2 Contributions
   8.3 Limites et Difficultés Rencontrées
   8.4 Perspectives d'Amélioration

Bibliographie / Références
Annexes
```

---

## ══════════════════════════════════════
## 📖 CHAPTER 1 — INTRODUCTION GÉNÉRALE
## ══════════════════════════════════════

### 1.1 Contexte et Problématique

- Le système de santé algérien fait face à une croissance majeure du nombre d'ordonnances papier manuscrites et imprimées, souvent illisibles.
- Les erreurs médicamenteuses (mauvais médicament, mauvaise posologie, interactions non détectées) représentent un problème de santé publique documenté.
- La Carte Chifa est largement utilisée mais peu intégrée dans des systèmes numériques cohérents.
- Absence quasi-totale d'outils informatiques modernes dans les pharmacies algériennes de ville.
- **Problème central :** Comment automatiser la lecture des ordonnances algériennes et détecter les interactions médicamenteuses en temps réel ?

### 1.2 Objectifs du Projet

1. Concevoir et développer une plateforme web fullstack multi-rôle (patient, pharmacien, admin).
2. Implémenter un pipeline OCR capable de lire les ordonnances algériennes (imprimées et manuscrites).
3. Intégrer une base de données de médicaments algériens avec détection automatique d'interactions.
4. Intégrer un assistant IA (PharmaAssist) pour les pharmaciens et patients via Gemini API.
5. Assurer la sécurité des données via Row Level Security (Supabase / PostgreSQL).

### 1.3 Périmètre

- **Inclus :** Gestion d'ordonnances, scan OCR, interactions médicamenteuses, assistant IA, Carte Chifa numérique, tableau de bord admin national.
- **Exclu :** Intégration directe avec les systèmes CNAS/CHIFA existants, prescriptions en arabe (roadmap), application mobile native.

### 1.4 Organisation du Mémoire

> *Décrire ici brièvement ce que contient chaque chapitre.*

---

## ══════════════════════════════════════
## 📚 CHAPTER 2 — ÉTAT DE L'ART
## ══════════════════════════════════════

### 2.1 Systèmes de Gestion Pharmaceutique

| Système | Pays | Points Forts | Limites pour l'Algérie |
|---------|------|-------------|------------------------|
| PharmaSys | Maghreb | Gestion stock | Pas d'IA, pas d'OCR |
| Logiciels génériques (Tunisie, Maroc) | Afrique du Nord | Interface simple | Pas adapté ordonnances DZ |
| Epic / Cerner | USA/Europe | Complet, intégré | Complexe, coûteux, non adapté |

### 2.2 OCR Médical — État de l'Art

- **Tesseract OCR (Google)** : Open source, mais limité sur le manuscrit et les mises en page complexes.
- **EasyOCR** : Multi-langue, détection CRAFT, bonne précision sur le texte imprimé.
- **TrOCR (Microsoft, 2021)** : Modèle Transformer Vision Encoder-Decoder, entraîné sur des images de texte. State-of-the-art sur les benchmarks manuscrits (IAM, IMGUR5K). **→ Choix retenu dans PharMinds.**
- **Gemini Vision API** : API multimodale de Google, utilisée ici pour l'annotation automatique du dataset et le scan en production.

### 2.3 Détection des Interactions Médicamenteuses

- Bases de données référence : DrugBank, Thériaque, VIDAL.
- Approches ML : NLP sur notices médicales, graph-based drug interaction prediction.
- Dans PharMinds : **approche base de données + règles** (sévérité : majeure / modérée / mineure) avec vérification en temps réel via Supabase.

### 2.4 Technologies Cloud / BaaS

- **Firebase** : populaire mais moins adapté aux requêtes SQL complexes.
- **Supabase** : PostgreSQL + Auth + Realtime + Edge Functions (Deno). **→ Choix retenu.**
- **Vite + React** : Build tool ultra-rapide, recommandé pour les SPA modernes.

---

## ══════════════════════════════════════
## 🔍 CHAPTER 3 — ANALYSE DES BESOINS
## ══════════════════════════════════════

### 3.1 Acteurs du Système

| Acteur | Rôle | Actions Principales |
|--------|------|---------------------|
| **Patient** | Utilisateur final | Gérer ordonnances, consulter médicaments, scanner prescriptions, voir Carte Chifa |
| **Pharmacien** | Professionnel de santé | Vérifier interactions, scanner ordonnances, gérer patients assignés |
| **Administrateur** | Gestionnaire système | Superviser utilisateurs, gérer base médicaments, surveiller système |
| **AI (Gemini)** | Assistant | Répondre aux questions médicamenteuses, analyser images |

### 3.2 Besoins Fonctionnels

**Module Patient :**
- [F01] Créer/gérer un compte avec profil médical
- [F02] Ajouter et consulter ses ordonnances numériques
- [F03] Scanner une ordonnance papier par IA
- [F04] Visualiser sa Carte Chifa numérique
- [F05] Consulter la liste de ses médicaments avec posologies
- [F06] Dialoguer avec PharmaAssist (IA)

**Module Pharmacien :**
- [F07] Vérifier les interactions entre deux médicaments en temps réel
- [F08] Scanner et analyser une ordonnance avec le pipeline OCR
- [F09] Gérer les patients assignés à sa pharmacie
- [F10] Consulter les alertes d'interactions par sévérité
- [F11] Accéder à la base de médicaments algériens

**Module Admin :**
- [F12] Superviser tous les utilisateurs (pharmaciens + patients)
- [F13] Gérer et enrichir la base de médicaments
- [F14] Surveiller les alertes critiques au niveau national
- [F15] Consulter les statistiques par wilaya

### 3.3 Besoins Non-Fonctionnels

- **Sécurité** : Row Level Security (RLS) sur toutes les tables Supabase. Rôles séparés (admin, pharmacist, patient). HTTPS.
- **Performance** : Temps de réponse scan < 10 secondes. Interface < 3s au chargement.
- **Disponibilité** : Supabase garantit 99.9% uptime. Edge Functions serverless.
- **Scalabilité** : Architecture serverless + modèle OCR local GPU.
- **Accessibilité** : Responsive design (mobile + desktop), interface bilingue (FR/AR partiel).

---

## ══════════════════════════════════════
## 🏗️ CHAPTER 4 — CONCEPTION ET ARCHITECTURE
## ══════════════════════════════════════

### 4.1 Architecture Globale

```text
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Client)                     │
│          React 18 + TypeScript + Vite + TailwindCSS      │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Patient  │  │  Pharmacien   │  │   Administrateur │  │
│  │ Module   │  │    Module     │  │      Module      │  │
│  └──────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / REST
           ┌──────────────┼────────────────────┐
           ▼              ▼                    ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   Supabase      │ │  Supabase    │ │  Google Gemini   │
│   PostgreSQL    │ │  Edge Func   │ │  API (AI Chat +  │
│   (Auth + RLS)  │ │  (Deno/TS)   │ │  Vision/OCR LLM) │
│                 │ │  scan-presc  │ │                  │
│  Tables:        │ │  ai-chat     │ └──────────────────┘
│  - profiles     │ │  notifs      │
│  - drugs        │ └──────────────┘
│  - drug_inter.  │
│  - ordonnances  │ ┌──────────────────────────────────┐
│  - pharmacy_pat │ │  LOCAL OCR MICROSERVICE (Python) │
│  - notifications│ │  FastAPI + Uvicorn (port 8001)   │
└─────────────────┘ │  TrOCR Fine-Tuné (RTX 3050 GPU) │
                    │  + CRAFT Detection (EasyOCR)     │
                    └──────────────────────────────────┘

### 4.7 Résilience et Haute Disponibilité (Failover)

L'architecture de PharMinds repose sur un principe de **résilience multi-fournisseurs**. Pour garantir que le pharmacien ne se retrouve jamais face à une application indisponible (par exemple, si le serveur Colab s'éteint), un système de **failover automatique** a été implémenté au niveau du service AI :

1.  **Tier 1 : Cerveau Privé (Google Colab)** : Utilisation prioritaire de l'instance locale/privée (Qwen-2.5-14B) pour la confidentialité des données et l'absence de coûts API.
2.  **Tier 2 : API de secours (Arcee AI / Gemini)** : Basculement instantané vers une API cloud de secours si le Tier 1 ne répond pas en moins de 2 secondes.

Ce mécanisme de "Smart Routing" permet de concilier la souveraineté des données médicales avec la fiabilité requise pour un outil de santé critique.
```

### 4.2 Stack Technologique

| Couche | Technologie | Version | Rôle |
|--------|------------|---------|------|
| Frontend | React | 18.3.1 | UI Components |
| Frontend | TypeScript | 5.8.3 | Type Safety |
| Frontend | Vite | 5.4.19 | Build Tool |
| Frontend | Framer Motion | 12.x | Animations UI |
| Frontend | TailwindCSS | 3.4.17 | Styling |
| Frontend | Radix UI | Multiple | Composants Accessibles |
| Frontend | React Router | 6.30.1 | Navigation SPA |
| Frontend | TanStack Query | 5.x | Data Fetching |
| Backend | Supabase | 2.x | BaaS (Auth, DB, Functions) |
| Database | PostgreSQL | 15+ | Données Relationnelles |
| AI Chat | Gemini API | Latest | Modèle de Langage |
| AI Scan | Gemini Vision | Latest | Analyse d'Images |
| OCR | TrOCR | microsoft/trocr-small-handwritten | Reconnaissance OCR |
| Détection | EasyOCR / CRAFT | Latest | Détection de Texte |
| OCR Server | FastAPI + Uvicorn | Latest | Microservice OCR API |
| Runtime | Python | 3.10+ | Environnement OCR |
| GPU | NVIDIA RTX 3050 | 4Go VRAM | Inférence OCR |

### 4.3 Schéma de Base de Données

**Tables principales :**

```sql
-- Profils utilisateurs (étend auth.users)
profiles (id, email, full_name, role, wilaya, created_at)
  -- role ∈ {'patient', 'pharmacist', 'admin'}

-- Base de médicaments algériens
drugs (id, name_fr, name_ar, generic_name, dosage, form, price_dz, atc_code)

-- Interactions médicamenteuses
drug_interactions (
  id, drug_a_id→drugs, drug_b_id→drugs,
  severity,           -- 'majeure' | 'modérée' | 'mineure'
  description_fr, mechanism_fr, created_at
)

-- Ordonnances
ordonnances (id, patient_id→profiles, doctor_name,
             date, medications JSONB, notes, created_at)

-- Lien pharmacien ↔ patient
pharmacy_patients (id, pharmacist_id→profiles, patient_id→profiles, created_at)

-- Notifications
notifications (id, user_id→profiles, title, message, type, read, created_at)
```

---

## ══════════════════════════════════════
## 🤖 CHAPTER 5 — MODULE OCR MÉDICAL
## ══════════════════════════════════════

### 5.1 Choix du Modèle : TrOCR

- **Architecture** : Vision Encoder-Decoder. L'encodeur est un ViT (Vision Transformer / BEiT) qui encode l'image en représentations visuelles. Le décodeur est un Transformer de langage (RoBERTa style) qui génère le texte token par token.
- **Modèle de base** : `microsoft/trocr-small-handwritten` (pré-entraîné sur IAM + IMGUR5K).
- **Raison du choix** : End-to-end sans lexique requis, supporte nativement le manuscrit, poids compatibles avec 4 Go VRAM (RTX 3050).

### 5.2 Génération du Dataset Synthétique Algérien

```text
Dataset synthétique total : 8 000 images
  ├── 5 000 images "printed"      (polices Arial, Times New Roman, Calibri)
  └── 3 000 images "handwritten"  (polices cursives téléchargées)

Vocabulaire médicaments (40+) :
  Doliprane 1000mg, Augmentin 1g, Glucophage 850, Diamicron 60,
  Plavix 75, Lasilix 40, Daflon 500, Levothyrox 100, Flagyl 125,
  Bronchocal, Vit D3 200 000, Crestor, Motilium, Bipreterax,
  Amlodipine 5mg, Voltarene 75mg, Spasfon 80mg, Aspegic 1000mg...

Posologies (format français médical algérien) :
  "1 comp matin et soir", "3x/jour après repas", "1/j 03 mois",
  "02 cp 02 f / j", "1 c / 8h 3j", "1 sachet Après les repas 3/j"...

Augmentations appliquées :
  - Bruit gaussien (σ ∈ [5, 15])
  - Flou gaussien (radius ∈ [0.5, 1.2])
  - Rotation légère (angle ∈ [-2°, +2°])
  - Variation couleur fond (blanc crème, gris clair, bleuté)
  - Variation couleur texte (noir, bleu foncé, gris foncé)
```

### 5.3 Annotation Automatique (Gemini Vision API)

- Script `auto_annotate.py` : envoi de chaque crop de ligne d'image à l'API Gemini Vision pour transcription automatique.
- Produit un fichier CSV `(file_name, text)` pour le fine-tuning.
- Traite les données réelles issues de vrais scans de prescriptions (`real_data_lines/`).
- Extraction via `extract_real_lines.py` : CRAFT détecte les lignes, crop et sauvegarde.

### 5.4 Pipeline de Fine-Tuning

```python
# Paramètres clés (train_trocr.py)
Base Model          : microsoft/trocr-small-handwritten
Split               : 80% train / 20% eval
Batch Size effectif : 16 (per_device=4 × gradient_accumulation=4)
Learning Rate       : 5e-5
Epochs              : 10 (configurable via argparse)
FP16                : True  (RTX 3050 - 4Go VRAM)
Gradient Checkpointing : True  (économie VRAM)
Métrique            : CER (Character Error Rate) via HuggingFace datasets
Save Strategy       : "epoch" (save_total_limit=2)
Output              : ./trocr-algerian-medical-final/
```

### 5.5 Pipeline de Reconnaissance (Inference)

```text
Image d'ordonnance
      │
      ▼
┌─────────────────────────────────┐
│  CRAFT Detection (via EasyOCR)  │
│  Détecte les bounding boxes     │
│  de chaque ligne de texte       │
│  Output: [x_min, x_max,         │
│           y_min, y_max]         │
└────────────────┬────────────────┘
                 │  Liste de bbox triées top→bottom
                 ▼
         Pour chaque ligne :
┌─────────────────────────────────┐
│  Crop + Padding (+10px)         │
│  BGR → RGB conversion (OpenCV)  │
│  → PIL.Image                    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  TrOCR Recognize (GPU)          │
│  processor(image) → pixel_vals  │
│  model.generate(pixel_values,   │
│    max_length=64)               │
│  → batch_decode → texte         │
└────────────────┬────────────────┘
                 │  Raw text lines
                 ▼
┌─────────────────────────────────┐
│  Extraction Structurée (Regex)  │
│  • Doctor: r"dr\.|docteur|pr\." │
│  • Meds:   r"\d+(mg|g|ml|ui)"  │
│  → {doctor_name, medications[]} │
└────────────────┬────────────────┘
                 │
                 ▼
          JSON Response
  {
    success: true,
    raw_ocr: ["ligne1", "ligne2"...],
    extracted_data: {
      doctor_name: "Dr. Ahmed Benali",
      medications: [{name, instructions}]
    }
  }
```

### 5.6 Déploiement FastAPI Local

- `serve.py` → FastAPI sur `localhost:8001`
- `POST /scan` : accepte un fichier image (UploadFile), retourne JSON structuré.
- `GET /health` : vérifie si le modèle est chargé.
- Chargement unique du modèle au démarrage (optimisation GPU VRAM).
- Fallback automatique vers `microsoft/trocr-small-handwritten` si le modèle fine-tuné est absent.
- CORS configuré pour les requêtes du frontend Vite (localhost:5173).

---

## ══════════════════════════════════════
## 💻 CHAPTER 6 — IMPLÉMENTATION PLATEFORME
## ══════════════════════════════════════

### 6.1 Module Patient

| Page / Composant | Fonctionnalité |
|-----------------|----------------|
| `PatientDashboard.tsx` | Vue d'ensemble, statistiques personnelles |
| `Ordonnances.tsx` | Liste, création, scan AI d'ordonnances |
| `PatientMedications.tsx` | Liste médicaments avec posologies |
| `CarteChifa.tsx` | Carte Chifa numérique avec infos assurance |
| `PatientAssistant.tsx` | Chat IA PharmaAssist |
| `PatientProfile.tsx` | Profil médical, antécédents, allergies |

### 6.2 Module Pharmacien

| Composant | Fonctionnalité |
|-----------|----------------|
| `PharmacistDashboard.tsx` | Stats temps réel (médicaments, interactions, alertes critiques, patients) |
| `DrugInteractionChecker.tsx` | Vérification temps réel d'interactions entre 2 médicaments |
| `PrescriptionScanner.tsx` | Upload + preprocessing + scan IA de l'ordonnance |
| `ImagePreprocessor.tsx` | Amélioration image (contraste, netteté) avant OCR |
| `InteractionAlert.tsx` | Affichage des alertes d'interactions post-scan avec sévérité |
| `PatientDetailDialog.tsx` | Dossier complet d'un patient assigné |

### 6.3 Module Administration

| Page | Fonctionnalité |
|------|----------------|
| `AdminDashboard.tsx` | Vue nationale : pharmaciens, patients, médicaments, interactions |
| `/admin/users` | Gestion des utilisateurs et rôles |
| `/admin/drugs` | CRUD de la base médicaments |
| `/admin/interactions` | Gestion des interactions enregistrées |
| Couverture Wilaya | Répartition géographique par wilaya (Alger, Oran, Constantine...) |

### 6.4 Intelligence Artificielle

**Scan d'ordonnances (Gemini Vision via Edge Function) :**
```text
Frontend → POST /functions/v1/scan-prescription
  {imageBase64: "..."}
  → Deno Edge Function
  → Gemini Vision API
  → {doctor_name, patient_name, medications[], confidence_score}
```

**PharmaAssist Chat (Gemini Chat via Edge Function) :**
```text
Frontend → POST /functions/v1/ai-chat
  {message: "...", role: "pharmacist"|"patient"}
  → Deno Edge Function + contexte
  → Gemini Chat API
  → réponse contextuelle
```

### 6.5 Sécurité — Row Level Security (RLS)

```sql
-- Un patient ne voit que ses propres ordonnances
CREATE POLICY "patients_own_ordonnances" ON ordonnances
  FOR ALL USING (auth.uid() = patient_id);

-- Un pharmacien voit seulement ses patients assignés
CREATE POLICY "pharmacist_see_assigned" ON pharmacy_patients
  FOR SELECT USING (auth.uid() = pharmacist_id);

-- Seul l'admin peut modifier la base de médicaments
CREATE POLICY "admin_manage_drugs" ON drugs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## ══════════════════════════════════════
## 🧪 CHAPTER 7 — TESTS ET ÉVALUATION
## ══════════════════════════════════════

### 7.1 Métriques OCR

| Métrique | Description | Formule |
|----------|-------------|---------|
| **CER** (Character Error Rate) | Erreurs au niveau caractère | (S + D + I) / N |
| **WER** (Word Error Rate) | Erreurs au niveau mot | (Sw + Dw + Iw) / Nw |
| **Accuracy** | Taux de lignes parfaitement reconnues | Exact matches / Total |

> S = substitutions, D = deletions, I = insertions, N = nb caractères de référence

### 7.2 Tests Fonctionnels

| Test | Module | Résultat Attendu |
|------|--------|-----------------|
| Inscription patient | Auth | Compte créé, rôle 'patient' assigné automatiquement |
| Login pharmacien | Auth | Redirection dashboard pharmacien |
| Vérification interaction | Pharmacien | Alerte avec sévérité correcte (majeure/modérée/mineure) |
| Scan ordonnance | Pharmacien | JSON structuré retourné en < 10s |
| Ajout ordonnance | Patient | Ordonnance sauvegardée en base |
| Chat PharmaAssist | All | Réponse contextuelle en < 3s |
| Attribution rôle admin | Admin | Seul admin peut modifier drugs |
| RLS isolation | Security | Patient B ne voit pas les données Patient A |

### 7.3 Environnement de Test

- **Hardware OCR** : NVIDIA RTX 3050, 4 Go VRAM, Intel Core i5 12th Gen, 16 Go RAM
- **Frontend** : Chrome 124+, Firefox 125+, Microsoft Edge 124+
- **Backend** : Supabase Cloud (région EU-West)
- **Python** : 3.10+, PyTorch 2.x, CUDA 11.8

---

## ══════════════════════════════════════
## 🏁 CHAPTER 8 — CONCLUSION ET PERSPECTIVES
## ══════════════════════════════════════

### 8.1 Bilan

- Développement d'une plateforme web full-stack complète et fonctionnelle.
- Implémentation d'un pipeline OCR adapté au contexte algérien (dataset synthétique + annotation automatique).
- Intégration d'un système de détection d'interactions médicamenteuses en temps réel.
- Déploiement d'un assistant IA PharmaAssist via Google Gemini.

### 8.2 Contributions

1. **Dataset synthétique d'ordonnances algériennes** (8 000 images) — contribution originale.
2. **Modèle TrOCR fine-tuné** sur le vocabulaire médical algérien (médicaments + posologies).
3. **Plateforme web multi-rôle** avec architecture moderne (React + Supabase + FastAPI).
4. **Double approche IA** : Gemini Vision pour la production + TrOCR local fine-tuné pour la recherche.

### 8.3 Limites

- Dataset réel limité (recueil difficile pour raisons de confidentialité RGPD/DZ).
- Prescriptions en arabe pas encore supportées (TrOCR limité sur l'arabe).
- Modèle OCR local requiert une GPU — pas encore cloud-déployé.
- Base d'interactions médicamenteuses à compléter (couverture partielle du marché algérien).

### 8.4 Perspectives

- Extension au support de l'arabe (fine-tuning TrOCR arabe ou modèles ArTrOCR).
- Application mobile (React Native) pour les pharmaciens de terrain.
- Intégration avec l'API CNAS (Carte Chifa réelle) via conventions institutionnelles.
- Déploiement du modèle OCR sur cloud GPU (AWS/GCP/Vast.ai).
- Enrichissement de la base de médicaments en partenariat avec des agences de régulation DZ.
- Module de pharmacovigilance et reporting automatique vers les autorités sanitaires.

---

## ══════════════════════════════════════
## 📚 BIBLIOGRAPHIE (Références Clés)
## ══════════════════════════════════════

```text
[1] Li, M., et al. (2021). "TrOCR: Transformer-based Optical Character
    Recognition with Pre-trained Models." arXiv:2109.10282.

[2] Baek, Y., et al. (2019). "Character Region Awareness for Text
    Detection (CRAFT)." CVPR 2019.

[3] Dosovitskiy, A., et al. (2020). "An Image is Worth 16x16 Words:
    Transformers for Image Recognition at Scale." arXiv:2010.11929.

[4] Vaswani, A., et al. (2017). "Attention Is All You Need."
    NeurIPS 2017.

[5] Team, G. (2023). "Gemini: A Family of Highly Capable Multimodal
    Models." Google DeepMind Technical Report.

[6] Supabase Inc. (2024). Supabase Documentation. https://supabase.com/docs

[7] Facebook Open Source (2023). React Documentation. https://react.dev

[8] Wolf, T., et al. (2020). "HuggingFace's Transformers: State-of-the-Art
    Natural Language Processing." EMNLP 2020.

[9] Ministère de la Santé Algérien (2023). Liste Nationale des Médicaments
    Essentiels. MSPRH Algérie.

[10] OMS (2019). "Medication Safety in High-Risk Situations."
     WHO Global Patient Safety Challenge Report.
```

---
---
---

# 🎯 CLAUDE PROMPT — RÉDACTION DU MÉMOIRE COMPLET

> **Instructions :** Copiez le prompt ci-dessous et collez-le dans une nouvelle conversation Claude (Claude Sonnet ou Opus recommandé).
> Ensuite, ajoutez à la fin la consigne de la session en cours (ex: "Génère le Chapitre 1 complet").

---

````markdown
## 📝 PROMPT POUR CLAUDE — RÉDACTION DU MÉMOIRE PFE : PharMinds Algeria

Tu es un expert académique spécialisé dans la rédaction de mémoires de Master
en informatique, intelligence artificielle et génie logiciel. Tu dois m'aider
à rédiger mon mémoire de fin d'études (PFE) en français académique de haut niveau.

---

### PROJET : PharMinds Algeria

Titre : PharMinds : Conception et Développement d'une Plateforme Intelligente
de Gestion Pharmaceutique avec OCR Médical et Détection d'Interactions
Médicamenteuses par IA pour le Contexte Algérien

---

### INFORMATIONS TECHNIQUES PRÉCISES

#### Stack Technique :
- Frontend : React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19 + TailwindCSS 3.4.17
  + Framer Motion (animations) + Radix UI (composants) + React Router v6
  + TanStack Query v5
- Backend : Supabase (PostgreSQL 15 + Auth + Row Level Security + Edge Functions Deno)
- IA Chat : Google Gemini API (via Supabase Edge Functions serverless)
- IA Scan : Google Gemini Vision (Edge Function scan-prescription)
- OCR Modèle : Microsoft TrOCR (microsoft/trocr-small-handwritten) fine-tuné
- OCR Détection : CRAFT algorithm via EasyOCR (Python)
- OCR Server : FastAPI + Uvicorn sur port 8001 (GPU local)
- GPU : NVIDIA RTX 3050 4Go VRAM / FP16 / Gradient Checkpointing

#### Dataset OCR :
- 8 000 images synthétiques : 5 000 imprimées + 3 000 manuscrites
- Médicaments algériens (40+) : Doliprane, Augmentin, Glucophage, Diamicron,
  Plavix, Lasilix, Daflon 500, Levothyrox, Flagyl 125, Bronchocal,
  Vit D3 200 000, Crestor, Motilium, Bipreterax, Amlodipine 5mg...
- Posologies en français médical algérien :
  "1 comp matin et soir", "3x/jour après repas", "1/j 03 mois", "02 cp 02 f/j"...
- Augmentations : bruit gaussien (σ∈[5,15]), flou gaussien, rotation [-2°,+2°],
  variation fond et couleur encre
- Annotation automatique : Google Gemini Vision API (script auto_annotate.py)

#### Fine-Tuning (train_trocr.py) :
- Split : 80% train / 20% eval
- Batch effectif : 16 (per_device=4 × gradient_accumulation=4)
- Learning rate : 5e-5
- Epochs : 10
- FP16 : True | Gradient checkpointing : True
- Métrique : CER (Character Error Rate) — HuggingFace datasets
- Sortie : ./trocr-algerian-medical-final/

#### Pipeline Inference (pipeline.py) :
1. Détection CRAFT → bounding boxes (x_min, x_max, y_min, y_max)
2. Tri top-to-bottom + crop + padding 10px + BGR→RGB
3. TrOCR recognize : pixel_values → model.generate(max_length=64) → batch_decode
4. Regex extraction : doctor (Dr./Docteur/Pr.) + medications (\d+(mg|g|ml|ui))
5. Output JSON : {success, raw_ocr:[], extracted_data:{doctor_name, medications:[]}}

#### Base de Données Supabase / PostgreSQL :
- profiles : id, email, full_name, role('patient'|'pharmacist'|'admin'), wilaya
- drugs : id, name_fr, name_ar, generic_name, dosage, form, price_dz, atc_code
- drug_interactions : drug_a_id, drug_b_id,
    severity('majeure'|'modérée'|'mineure'), description_fr, mechanism_fr
- ordonnances : patient_id, doctor_name, date, medications(JSONB), notes
- pharmacy_patients : pharmacist_id ↔ patient_id
- notifications : user_id, title, message, type, read

#### Modules Fonctionnels :

Patient :
- PatientDashboard, Ordonnances, PatientMedications, CarteChifa,
  PatientAssistant (chat IA), PatientProfile

Pharmacien :
- PharmacistDashboard (stats: médicaments/interactions/alertes/patients)
- DrugInteractionChecker (vérification temps réel 2 médicaments)
- PrescriptionScanner (upload → ImagePreprocessor → scan Gemini → InteractionAlert)
- PatientDetailDialog (dossier patient complet)

Admin :
- AdminDashboard (vue nationale par wilaya)
- Gestion users/roles, CRUD drugs/interactions, monitoring système

Sécurité RLS :
- Patient : accès uniquement à ses propres ordonnances
- Pharmacien : accès uniquement à ses patients assignés
- Admin : CRUD complet sur drugs, drug_interactions, profiles

---

### STYLE D'ÉCRITURE ATTENDU

- Français académique formel (niveau Master/Doctorat)
- Présent pour les faits établis, passé composé pour les réalisations
- Structure paragraphe : [Contexte → Problème → Solution → Résultat]
- Citations format [N] (ex: [1], [2])
- Acronymes définis à la 1ère occurrence (ex: OCR (Optical Character Recognition))
- Précis et technique — éviter les formulations vagues
- 300-500 mots par sous-section
- Indiquer [FIGURE X : description] pour les schémas recommandés
- Indiquer [TABLEAU X : description] pour les tableaux recommandés

---

### CONSIGNE DE CETTE SESSION :

[REMPLACER PAR LA CONSIGNE : ex. "Génère le Chapitre 5 complet : Module OCR Médical"]

````

---

### 🗂️ ORDRE DE GÉNÉRATION RECOMMANDÉ (une session Claude par chapitre)

| Session | Consigne à ajouter en bas du prompt |
|---------|-------------------------------------|
| **1** | Génère le **Chapitre 1** complet : Introduction Générale |
| **2** | Génère le **Chapitre 2** complet : État de l'Art |
| **3** | Génère le **Chapitre 3** complet : Analyse des Besoins + Diagrammes UML (textuel) |
| **4** | Génère le **Chapitre 4** complet : Conception et Architecture Globale |
| **5** | Génère le **Chapitre 5** complet : Module OCR Médical (TrOCR + Dataset + Pipeline) |
| **6** | Génère le **Chapitre 6** complet : Implémentation de la Plateforme Web |
| **7** | Génère le **Chapitre 7** complet : Tests et Évaluation |
| **8** | Génère la **Conclusion Générale et Perspectives** |
| **9** | Génère le **Résumé en français** (250 mots) et l'**Abstract en anglais** (250 mots) |

> 💡 **Astuce :** Commence par la Session 9 (Résumé/Abstract) pour valider le style avant d'attaquer les chapitres longs. Ensuite travaille dans l'ordre 1→8.

---

*Document généré par Antigravity — PharMinds Algeria PFE*
*Mise à jour : Avril 2026*
