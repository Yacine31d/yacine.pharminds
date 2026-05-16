/**
 * Guide — Trilingual onboarding catalogue
 * 🇫🇷 Français · 🇩🇿 العربية · 🇬🇧 English
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, FileText, Sparkles, Bell, Bot,
  Camera, ArrowLeftRight, CreditCard, Radio, Package, BarChart2,
  ChevronDown, ChevronUp, Lightbulb, Search, BookOpen,
  Stethoscope, Globe, Users, Heart, Download, Loader2, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

/* ─── Types ────────────────────────────────────────────────────────────────── */
type Lang = 'fr' | 'ar' | 'en';
type Role = 'patient' | 'pharmacist';
interface T { fr: string; ar: string; en: string; }

interface Feature {
  id: string;
  icon: React.ElementType;
  gradient: string;
  role: Role;
  isNew?: boolean;
  title: T;
  description: T;
  steps: T[];
  tip?: T;
  path?: string;
}

/* ─── Static UI strings ─────────────────────────────────────────────────────── */
const UI: Record<string, T> = {
  guideLabel:      { fr: 'Guide Utilisateur',            ar: 'دليل المستخدم',              en: 'User Guide' },
  heroTitle:       { fr: 'Bienvenue sur PharMinds',      ar: 'مرحباً بك في PharMinds',     en: 'Welcome to PharMinds' },
  heroSub:         { fr: 'Découvrez toutes les fonctionnalités de la plateforme en quelques minutes.', ar: 'اكتشف جميع ميزات المنصة في دقائق قليلة.', en: 'Discover all platform features in just a few minutes.' },
  searchPlaceholder:{ fr: 'Rechercher une fonctionnalité…', ar: 'ابحث عن ميزة…',           en: 'Search a feature…' },
  patientRole:     { fr: 'Je suis Patient',              ar: 'أنا مريض',                   en: 'I am a Patient' },
  pharmacistRole:  { fr: 'Je suis Pharmacien',           ar: 'أنا صيدلاني',                en: 'I am a Pharmacist' },
  howToUse:        { fr: 'Comment utiliser',             ar: 'كيفية الاستخدام',            en: 'How to use' },
  newBadge:        { fr: 'Nouveau',                      ar: 'جديد',                       en: 'New' },
  goTo:            { fr: 'Accéder à la page',            ar: 'الانتقال إلى الصفحة',        en: 'Go to page' },
  noResults:       { fr: 'Aucune fonctionnalité trouvée.', ar: 'لم يتم العثور على ميزة.',  en: 'No feature found.' },
  featuresCount:   { fr: 'fonctionnalité(s)',            ar: 'ميزة',                       en: 'feature(s)' },
  tipLabel:        { fr: 'Conseil Pro',                  ar: 'نصيحة احترافية',             en: 'Pro Tip' },
};

/* ─── Features data ─────────────────────────────────────────────────────────── */
const FEATURES: Feature[] = [

  /* ══════════════ PATIENT ══════════════ */
  {
    id: 'radar-stock',
    icon: MapPin,
    gradient: 'from-cyan-500 to-blue-500',
    role: 'patient',
    isNew: true,
    title: { fr: 'Radar Stock', ar: 'رادار المخزون', en: 'Stock Radar' },
    description: {
      fr: 'Trouvez en temps réel quelle pharmacie de votre wilaya dispose du médicament dont vous avez besoin.',
      ar: 'اكتشف في الوقت الفعلي أي صيدلية في ولايتك تمتلك الدواء الذي تحتاجه.',
      en: 'Find in real-time which pharmacy in your wilaya has the medication you need.',
    },
    steps: [
      { fr: 'Cliquez sur "Radar Stock" dans le menu latéral.', ar: 'انقر على "رادار المخزون" في القائمة الجانبية.', en: 'Click "Stock Radar" in the sidebar.' },
      { fr: 'Tapez le nom du médicament dans la barre de recherche.', ar: 'اكتب اسم الدواء في شريط البحث.', en: 'Type the medication name in the search bar.' },
      { fr: 'Sélectionnez votre wilaya dans le menu déroulant.', ar: 'اختر ولايتك من القائمة المنسدلة.', en: 'Select your wilaya from the dropdown.' },
      { fr: 'Consultez la liste classée des pharmacies avec stock disponible.', ar: 'راجع القائمة المرتبة للصيدليات التي تمتلك المخزون.', en: 'Browse the ranked list of pharmacies with available stock.' },
      { fr: 'Appelez directement la pharmacie depuis l\'application.', ar: 'اتصل بالصيدلية مباشرة من التطبيق.', en: 'Call the pharmacy directly from the app.' },
    ],
    tip: {
      fr: 'Changez de wilaya pour élargir votre recherche si votre médicament est introuvable localement.',
      ar: 'غيّر الولاية لتوسيع بحثك إذا لم تجد دواءك محلياً.',
      en: 'Switch wilaya to broaden your search if the medication is not found locally.',
    },
    path: '/patient/drug-search',
  },

  {
    id: 'ordonnances',
    icon: FileText,
    gradient: 'from-violet-500 to-purple-600',
    role: 'patient',
    title: { fr: 'Mes Ordonnances', ar: 'وصفاتي الطبية', en: 'My Prescriptions' },
    description: {
      fr: 'Stockez, consultez et gérez toutes vos ordonnances médicales en un seul endroit sécurisé.',
      ar: 'احفظ وراجع وأدر جميع وصفاتك الطبية في مكان واحد آمن.',
      en: 'Store, view and manage all your medical prescriptions in one secure place.',
    },
    steps: [
      { fr: 'Allez dans "Ordonnances" depuis le menu.', ar: 'انتقل إلى "الوصفات الطبية" من القائمة.', en: 'Go to "Prescriptions" from the menu.' },
      { fr: 'Cliquez "Nouvelle Ordonnance" pour en ajouter une.', ar: 'انقر "وصفة جديدة" لإضافة واحدة.', en: 'Click "New Prescription" to add one.' },
      { fr: 'Remplissez les informations du médecin et les médicaments.', ar: 'أدخل معلومات الطبيب والأدوية.', en: 'Fill in the doctor info and medications.' },
      { fr: 'Cliquez sur une ordonnance pour voir ses détails complets.', ar: 'انقر على وصفة لرؤية تفاصيلها الكاملة.', en: 'Click on a prescription to see its full details.' },
    ],
    tip: {
      fr: 'Activez "Ordonnance Claire" pour une version simplifiée avec les horaires de prise visuels.',
      ar: 'فعّل "الوصفة الواضحة" للحصول على نسخة مبسطة مع جدول الجرعات المرئي.',
      en: 'Enable "Clear Prescription" for a simplified version with visual dosage schedules.',
    },
    path: '/patient/ordonnances',
  },

  {
    id: 'ordonnance-claire',
    icon: Sparkles,
    gradient: 'from-blue-500 to-indigo-500',
    role: 'patient',
    isNew: true,
    title: { fr: 'Ordonnance Claire', ar: 'الوصفة الواضحة', en: 'Clear Prescription' },
    description: {
      fr: 'Transformez votre ordonnance en guide simple — descriptions claires de chaque médicament, horaires visuels et rappels automatiques.',
      ar: 'حوّل وصفتك إلى دليل بسيط — شرح واضح لكل دواء، جداول بصرية وتذكيرات تلقائية.',
      en: 'Turn your prescription into a simple guide — clear drug descriptions, visual schedules and automatic reminders.',
    },
    steps: [
      { fr: 'Ouvrez une ordonnance depuis "Mes Ordonnances".', ar: 'افتح وصفة من "وصفاتي الطبية".', en: 'Open a prescription from "My Prescriptions".' },
      { fr: 'Cliquez sur le bouton "📋 Vue Claire".', ar: 'انقر على زر "📋 عرض واضح".', en: 'Click the "📋 Clear View" button.' },
      { fr: 'Lisez la description simplifiée de chaque médicament.', ar: 'اقرأ الوصف المبسط لكل دواء.', en: 'Read the simplified description of each medication.' },
      { fr: 'Consultez les chips horaires 🌅☀️🌆🌙 pour les prises.', ar: 'راجع رموز المواعيد 🌅☀️🌆🌙 للجرعات.', en: 'Check the schedule chips 🌅☀️🌆🌙 for dosing times.' },
      { fr: 'Basculez entre Français et عربي avec le bouton de langue.', ar: 'بدّل بين الفرنسية والعربية بزر اللغة.', en: 'Toggle between French and Arabic with the language button.' },
      { fr: 'Ajoutez un rappel pour ne jamais oublier une prise.', ar: 'أضف تذكيراً لعدم نسيان أي جرعة.', en: 'Add a reminder so you never miss a dose.' },
    ],
    tip: {
      fr: 'Imprimez la version claire pour la partager avec un proche ou pour l\'avoir toujours sur vous.',
      ar: 'اطبع النسخة الواضحة لمشاركتها مع أحد أفراد العائلة أو لحملها معك دائماً.',
      en: 'Print the clear version to share with a family member or always keep it with you.',
    },
  },

  {
    id: 'suivi-medicaments',
    icon: Bell,
    gradient: 'from-green-500 to-emerald-500',
    role: 'patient',
    title: { fr: 'Suivi des Médicaments', ar: 'متابعة الأدوية', en: 'Medication Tracking' },
    description: {
      fr: 'Suivez vos médicaments actifs, gérez vos traitements en cours et ne manquez jamais une prise.',
      ar: 'تابع أدويتك النشطة، أدر علاجاتك الجارية ولا تفوّت أي جرعة.',
      en: 'Track your active medications, manage ongoing treatments and never miss a dose.',
    },
    steps: [
      { fr: 'Accédez à "Mes Médicaments" depuis le menu.', ar: 'ادخل إلى "أدويتي" من القائمة.', en: 'Go to "My Medications" from the menu.' },
      { fr: 'Cliquez "Ajouter un médicament".', ar: 'انقر "إضافة دواء".', en: 'Click "Add a medication".' },
      { fr: 'Entrez le nom, dosage, fréquence et durée.', ar: 'أدخل الاسم والجرعة والتكرار والمدة.', en: 'Enter name, dosage, frequency and duration.' },
      { fr: 'Activez les rappels pour recevoir des notifications de prise.', ar: 'فعّل التذكيرات لتلقي إشعارات الجرعات.', en: 'Enable reminders to get dosing notifications.' },
    ],
    tip: {
      fr: 'Depuis "Ordonnance Claire", cliquez "Ajouter un rappel" pour importer un médicament en un clic.',
      ar: 'من "الوصفة الواضحة"، انقر "إضافة تذكير" لاستيراد دواء بنقرة واحدة.',
      en: 'From "Clear Prescription", click "Add Reminder" to import a medication in one click.',
    },
    path: '/patient/medications',
  },

  {
    id: 'assistant-ia-patient',
    icon: Bot,
    gradient: 'from-amber-500 to-orange-500',
    role: 'patient',
    title: { fr: 'Assistant IA Santé', ar: 'مساعد الذكاء الاصطناعي الصحي', en: 'AI Health Assistant' },
    description: {
      fr: 'Posez vos questions médicales à notre assistant intelligent — médicaments, symptômes, interactions — disponible 24h/24.',
      ar: 'اطرح أسئلتك الطبية على مساعدنا الذكي — أدوية، أعراض، تفاعلات — متاح على مدار الساعة.',
      en: 'Ask your medical questions to our smart assistant — medications, symptoms, interactions — available 24/7.',
    },
    steps: [
      { fr: 'Cliquez sur "Assistant IA" dans le menu latéral.', ar: 'انقر على "مساعد الذكاء الاصطناعي" في القائمة.', en: 'Click "AI Assistant" in the sidebar.' },
      { fr: 'Tapez votre question (français, arabe ou anglais).', ar: 'اكتب سؤالك (بالفرنسية أو العربية أو الإنجليزية).', en: 'Type your question (French, Arabic or English).' },
      { fr: 'Recevez une réponse détaillée et personnalisée.', ar: 'احصل على إجابة مفصلة ومخصصة.', en: 'Receive a detailed and personalized answer.' },
    ],
    tip: {
      fr: '⚠️ L\'assistant IA ne remplace pas un médecin. Consultez toujours un professionnel de santé pour un diagnostic.',
      ar: '⚠️ مساعد الذكاء الاصطناعي لا يحل محل الطبيب. استشر دائماً متخصصاً للتشخيص.',
      en: '⚠️ The AI assistant is not a substitute for a doctor. Always consult a healthcare professional for diagnosis.',
    },
    path: '/patient/assistant',
  },

  {
    id: 'carte-chifa-patient',
    icon: CreditCard,
    gradient: 'from-teal-500 to-cyan-600',
    role: 'patient',
    title: { fr: 'Carte Chifa', ar: 'بطاقة الشفاء', en: 'Chifa Card' },
    description: {
      fr: 'Consultez votre carte Chifa, suivez vos remboursements CNAS et vérifiez quels médicaments sont pris en charge.',
      ar: 'راجع بطاقة الشفاء الخاصة بك، تابع تسديدات CNAS وتحقق من الأدوية المشمولة.',
      en: 'View your Chifa card, track your CNAS reimbursements and check which medications are covered.',
    },
    steps: [
      { fr: 'Cliquez sur "Carte Chifa" dans le menu.', ar: 'انقر على "بطاقة الشفاء" في القائمة.', en: 'Click "Chifa Card" in the menu.' },
      { fr: 'Consultez votre numéro d\'assuré et vos informations.', ar: 'راجع رقم المؤمّن له ومعلوماتك.', en: 'View your insured number and personal info.' },
      { fr: 'Vérifiez si vos médicaments portent le badge CNAS ✓.', ar: 'تحقق إذا كانت أدويتك تحمل علامة CNAS ✓.', en: 'Check if your medications carry the CNAS ✓ badge.' },
    ],
    tip: {
      fr: 'Les médicaments avec le badge CNAS vert sont remboursables par la Sécurité Sociale.',
      ar: 'الأدوية التي تحمل شارة CNAS الخضراء مسددة من الضمان الاجتماعي.',
      en: 'Medications with the green CNAS badge are reimbursable by Social Security.',
    },
    path: '/patient/carte-chifa',
  },

  /* ══════════════ PHARMACIST ══════════════ */
  {
    id: 'scanner',
    icon: Camera,
    gradient: 'from-blue-600 to-indigo-600',
    role: 'pharmacist',
    title: { fr: 'Scanner d\'Ordonnances', ar: 'ماسح الوصفات الطبية', en: 'Prescription Scanner' },
    description: {
      fr: 'Photographiez une ordonnance manuscrite : l\'IA TrOCR extrait automatiquement tous les médicaments, dosages et instructions.',
      ar: 'صوّر وصفة مكتوبة بخط اليد: يستخرج الذكاء الاصطناعي TrOCR تلقائياً جميع الأدوية والجرعات والتعليمات.',
      en: 'Photograph a handwritten prescription: TrOCR AI automatically extracts all medications, dosages and instructions.',
    },
    steps: [
      { fr: 'Allez dans "Scan Ordonnance" depuis le menu.', ar: 'انتقل إلى "مسح الوصفة" من القائمة.', en: 'Go to "Scan Prescription" from the menu.' },
      { fr: 'Cliquez sur la zone de dépôt et sélectionnez l\'image.', ar: 'انقر على منطقة الرفع واختر الصورة.', en: 'Click the drop zone and select the image.' },
      { fr: 'L\'IA prétraite et lit l\'écriture (quelques secondes).', ar: 'يعالج الذكاء الاصطناعي النص ويقرأه (بضع ثوانٍ).', en: 'The AI preprocesses and reads the handwriting (a few seconds).' },
      { fr: 'Vérifiez les médicaments extraits et corrigez si nécessaire.', ar: 'تحقق من الأدوية المستخرجة وصحّح إذا لزم.', en: 'Verify the extracted medications and correct if needed.' },
      { fr: 'Cliquez "Sauvegarder" pour enregistrer dans la base de données.', ar: 'انقر "حفظ" للتسجيل في قاعدة البيانات.', en: 'Click "Save" to store in the database.' },
    ],
    tip: {
      fr: 'Si le serveur OCR est en veille, un compte à rebours de 35 secondes s\'affiche — il redémarre automatiquement.',
      ar: 'إذا كان خادم OCR في وضع السكون، يظهر عداد 35 ثانية — سيعيد التشغيل تلقائياً.',
      en: 'If the OCR server is sleeping, a 35-second countdown appears — it restarts automatically.',
    },
    path: '/pharmacist/scan',
  },

  {
    id: 'dci-switch',
    icon: ArrowLeftRight,
    gradient: 'from-amber-500 to-yellow-500',
    role: 'pharmacist',
    isNew: true,
    title: { fr: 'DCI Switch (Substitution)', ar: 'بديل DCI (الاستبدال)', en: 'DCI Switch (Substitution)' },
    description: {
      fr: 'Lorsqu\'un médicament scanné est hors stock, le panneau DCI propose automatiquement des génériques équivalents classés par disponibilité et prix.',
      ar: 'عندما يكون الدواء الممسوح نافد المخزون، يقترح لوح DCI تلقائياً أدوية جنيسة مكافئة مرتبة حسب التوفر والسعر.',
      en: 'When a scanned drug is out of stock, the DCI panel automatically suggests equivalent generics ranked by availability and price.',
    },
    steps: [
      { fr: 'Scannez une ordonnance normalement.', ar: 'امسح وصفة طبية بشكل اعتيادي.', en: 'Scan a prescription normally.' },
      { fr: 'Si un médicament est hors stock, le panneau DCI apparaît sous lui.', ar: 'إذا كان الدواء نافداً، يظهر لوح DCI تحته تلقائياً.', en: 'If a drug is out of stock, the DCI panel appears below it.' },
      { fr: 'Consultez les alternatives (génériques en premier, stock ✓ en vert).', ar: 'راجع البدائل (الجنيسة أولاً، المتوفر ✓ باللون الأخضر).', en: 'Review alternatives (generics first, in-stock ✓ highlighted in green).' },
      { fr: 'Cliquez "⚡ Utiliser" sur le substitut choisi.', ar: 'انقر "⚡ استخدام" على البديل المختار.', en: 'Click "⚡ Use" on the chosen substitute.' },
      { fr: 'Cliquez "Pas de substitution" pour ignorer et continuer.', ar: 'انقر "بدون استبدال" للتجاهل والمتابعة.', en: 'Click "No substitution" to skip and continue.' },
    ],
    tip: {
      fr: 'Les médicaments remboursables CNAS sont signalés par le badge vert — priorisez-les pour le patient.',
      ar: 'الأدوية المسددة من CNAS مُشارة بشارة خضراء — أعطِها الأولوية للمريض.',
      en: 'CNAS-reimbursed drugs are flagged with a green badge — prioritize them for the patient.',
    },
  },

  {
    id: 'chifa-auto',
    icon: CreditCard,
    gradient: 'from-emerald-500 to-green-600',
    role: 'pharmacist',
    isNew: true,
    title: { fr: 'Chifa Auto', ar: 'شيفا أوتو', en: 'Chifa Auto' },
    description: {
      fr: 'Gérez vos déclarations de remboursement CNAS : création assistée, calcul automatique du montant remboursable et suivi des statuts.',
      ar: 'أدر طلبات تسديد CNAS: إنشاء مُساعَد، حساب تلقائي للمبلغ المسدد وتتبع الحالات.',
      en: 'Manage your CNAS reimbursement claims: guided creation, automatic amount calculation and status tracking.',
    },
    steps: [
      { fr: 'Cliquez sur "Chifa Auto" dans le menu latéral.', ar: 'انقر على "شيفا أوتو" في القائمة الجانبية.', en: 'Click "Chifa Auto" in the sidebar.' },
      { fr: 'Cliquez "Nouvelle Déclaration".', ar: 'انقر "طلب جديد".', en: 'Click "New Claim".' },
      { fr: 'Étape 1 : Entrez le n° de carte Chifa et le nom du patient.', ar: 'الخطوة 1: أدخل رقم بطاقة شيفا واسم المريض.', en: 'Step 1: Enter Chifa card number and patient name.' },
      { fr: 'Étape 2 : Sélectionnez l\'ordonnance — montant CNAS calculé automatiquement.', ar: 'الخطوة 2: اختر الوصفة — يُحسب مبلغ CNAS تلقائياً.', en: 'Step 2: Select the prescription — CNAS amount calculated automatically.' },
      { fr: 'Étape 3 : Vérifiez le récapitulatif et confirmez la déclaration.', ar: 'الخطوة 3: راجع الملخص وأكد الطلب.', en: 'Step 3: Review the summary and confirm the claim.' },
      { fr: 'Suivez la progression : En attente → Soumise → Approuvée → Payée.', ar: 'تابع التقدم: قيد الانتظار → مقدم → معتمد → مدفوع.', en: 'Track progress: Pending → Submitted → Approved → Paid.' },
    ],
    tip: {
      fr: 'Seuls les médicaments avec le badge CNAS ✓ sont inclus dans le calcul du montant remboursable.',
      ar: 'فقط الأدوية التي تحمل علامة CNAS ✓ تُحسب في المبلغ المسدد.',
      en: 'Only medications with the CNAS ✓ badge are included in the reimbursable amount calculation.',
    },
    path: '/pharmacist/chifa',
  },

  {
    id: 'rupture-radar',
    icon: Radio,
    gradient: 'from-red-500 to-rose-600',
    role: 'pharmacist',
    isNew: true,
    title: { fr: 'Rupture Radar', ar: 'رادار النفاد', en: 'Shortage Radar' },
    description: {
      fr: 'Surveillez les ruptures de stock en temps réel dans votre réseau de wilayas et anticipez les pénuries avant qu\'elles ne vous touchent.',
      ar: 'راقب نفاد المخزون في الوقت الفعلي في شبكة ولاياتك وتوقع النقص قبل أن يصلك.',
      en: 'Monitor real-time stock shortages in your wilaya network and anticipate shortages before they affect you.',
    },
    steps: [
      { fr: 'Allez dans "Alertes" depuis le menu pharmacien.', ar: 'انتقل إلى "التنبيهات" من قائمة الصيدلاني.', en: 'Go to "Alerts" from the pharmacist menu.' },
      { fr: 'Cliquez sur l\'onglet "🛰️ Radar Réseau".', ar: 'انقر على علامة التبويب "🛰️ رادار الشبكة".', en: 'Click the "🛰️ Network Radar" tab.' },
      { fr: 'Lisez les alertes groupées : 🔴 Critiques / 🟡 Avertissements / 🔵 Infos.', ar: 'اقرأ التنبيهات المجمعة: 🔴 حرجة / 🟡 تحذيرات / 🔵 معلومات.', en: 'Read grouped alerts: 🔴 Critical / 🟡 Warnings / 🔵 Info.' },
      { fr: 'Survolez une alerte et cliquez "Commander" pour approvisionner.', ar: 'مرّر على تنبيه وانقر "طلب" للتزود.', en: 'Hover an alert and click "Order" to restock.' },
      { fr: 'Cliquez "Actualiser" pour charger les données en temps réel.', ar: 'انقر "تحديث" لتحميل البيانات الفعلية.', en: 'Click "Refresh" to load real-time data.' },
    ],
    tip: {
      fr: 'Votre stock local sous le seuil minimum apparaît en tête de liste avec une barre de progression visuelle.',
      ar: 'يظهر مخزونك المحلي تحت الحد الأدنى في أعلى القائمة مع شريط تقدم بصري.',
      en: 'Your local stock below the minimum threshold appears at the top with a visual progress bar.',
    },
    path: '/pharmacist/alerts',
  },

  {
    id: 'inventaire',
    icon: Package,
    gradient: 'from-orange-500 to-amber-600',
    role: 'pharmacist',
    title: { fr: 'Gestion de Stock', ar: 'إدارة المخزون', en: 'Stock Management' },
    description: {
      fr: 'Gérez votre inventaire : ajoutez des médicaments, définissez des seuils d\'alerte et suivez les mouvements de stock.',
      ar: 'أدر مخزونك: أضف أدوية، حدد حدود التنبيه وتابع حركات المخزون.',
      en: 'Manage your inventory: add medications, set alert thresholds and track stock movements.',
    },
    steps: [
      { fr: 'Allez dans "Inventaire" depuis le menu.', ar: 'انتقل إلى "المخزون" من القائمة.', en: 'Go to "Inventory" from the menu.' },
      { fr: 'Cliquez "Ajouter un médicament" et remplissez les champs.', ar: 'انقر "إضافة دواء" واملأ الحقول.', en: 'Click "Add medication" and fill in the fields.' },
      { fr: 'Définissez le seuil minimum pour déclencher les alertes automatiques.', ar: 'حدد الحد الأدنى لتفعيل التنبيهات التلقائية.', en: 'Set the minimum threshold to trigger automatic alerts.' },
      { fr: 'Mettez à jour le stock après chaque dispensation ou réception.', ar: 'حدّث المخزون بعد كل صرف أو استلام.', en: 'Update stock after each dispensation or delivery.' },
    ],
    tip: {
      fr: 'Tout médicament sous le seuil apparaît automatiquement dans le Rupture Radar et les alertes locales.',
      ar: 'أي دواء تحت الحد يظهر تلقائياً في رادار النفاد والتنبيهات المحلية.',
      en: 'Any medication below threshold automatically appears in Shortage Radar and local alerts.',
    },
    path: '/pharmacist/inventory',
  },

  {
    id: 'analytics',
    icon: BarChart2,
    gradient: 'from-purple-500 to-violet-600',
    role: 'pharmacist',
    title: { fr: 'Analytiques & Rapports', ar: 'التحليلات والتقارير', en: 'Analytics & Reports' },
    description: {
      fr: 'Visualisez vos tendances de dispensation, les médicaments les plus vendus et l\'évolution de votre activité sur le temps.',
      ar: 'تصوّر اتجاهات الصرف، الأدوية الأكثر مبيعاً وتطور نشاطك بمرور الوقت.',
      en: 'Visualize your dispensation trends, best-selling medications and activity evolution over time.',
    },
    steps: [
      { fr: 'Accédez à "Analytiques" depuis le menu.', ar: 'ادخل إلى "التحليلات" من القائمة.', en: 'Access "Analytics" from the menu.' },
      { fr: 'Choisissez la période d\'analyse (7j / 30j / 90j).', ar: 'اختر فترة التحليل (7 أيام / 30 يوم / 90 يوم).', en: 'Choose the analysis period (7d / 30d / 90d).' },
      { fr: 'Explorez les graphiques de stock, ventes et tendances.', ar: 'استكشف مخططات المخزون والمبيعات والاتجاهات.', en: 'Explore stock, sales and trend charts.' },
    ],
    tip: {
      fr: 'Utilisez ces données pour planifier vos commandes avant les pics saisonniers (grippe, allergies, etc.).',
      ar: 'استخدم هذه البيانات لتخطيط طلباتك قبل الذروات الموسمية (إنفلونزا، حساسية، إلخ).',
      en: 'Use this data to plan your orders before seasonal peaks (flu, allergies, etc.).',
    },
    path: '/pharmacist/analytics',
  },

  {
    id: 'assistant-ia-pharmacist',
    icon: Bot,
    gradient: 'from-sky-500 to-blue-500',
    role: 'pharmacist',
    title: { fr: 'Assistant IA Pharmacien', ar: 'مساعد الذكاء الاصطناعي للصيدلاني', en: 'Pharmacist AI Assistant' },
    description: {
      fr: 'Obtenez des informations instantanées sur les interactions médicamenteuses, les dosages et les contre-indications.',
      ar: 'احصل على معلومات فورية حول التفاعلات الدوائية والجرعات وموانع الاستخدام.',
      en: 'Get instant information on drug interactions, dosages and contraindications.',
    },
    steps: [
      { fr: 'Après un scan, l\'IA vérifie automatiquement les interactions entre médicaments.', ar: 'بعد المسح، يتحقق الذكاء الاصطناعي تلقائياً من التفاعلات بين الأدوية.', en: 'After a scan, AI automatically checks for drug interactions.' },
      { fr: 'Des alertes d\'interaction s\'affichent en bas du résultat de scan.', ar: 'تظهر تنبيهات التفاعل أسفل نتيجة المسح.', en: 'Interaction alerts appear at the bottom of the scan result.' },
      { fr: 'Consultez le niveau de sévérité : faible / modéré / sévère.', ar: 'راجع مستوى الخطورة: خفيف / معتدل / شديد.', en: 'Check the severity level: low / moderate / severe.' },
    ],
    tip: {
      fr: 'Les alertes d\'interaction sont générées automatiquement — aucune action manuelle requise.',
      ar: 'يتم توليد تنبيهات التفاعل تلقائياً — لا حاجة لأي إجراء يدوي.',
      en: 'Interaction alerts are generated automatically — no manual action required.',
    },
  },
];

/* ─── Feature Card Component ────────────────────────────────────────────────── */
function FeatureCard({ feature, lang, forceOpen = false }: { feature: Feature; lang: Lang; forceOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isOpen = forceOpen || open;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-border/60 overflow-hidden bg-card flex flex-col h-full print-card"
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${feature.gradient} p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <feature.icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm leading-tight">{feature.title[lang]}</h3>
              {feature.isNew && (
                <Badge className="bg-white/25 text-white text-[9px] border-white/30 h-4 px-1.5 font-semibold">
                  {UI.newBadge[lang]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {feature.description[lang]}
        </p>

        {/* Expand toggle */}
        {!forceOpen && (
          <button
            onClick={() => setOpen(o => !o)}
            className="no-print flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/70 transition-colors w-fit"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {UI.howToUse[lang]}
          </button>
        )}

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3"
            >
              {/* Numbered steps */}
              <ol className="space-y-2.5">
                {feature.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${feature.gradient} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                      {i + 1}
                    </span>
                    <span className="text-foreground/80 leading-relaxed">{step[lang]}</span>
                  </li>
                ))}
              </ol>

              {/* Tip box */}
              {feature.tip && (
                <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-400/25 flex gap-2.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-amber-500 mb-0.5">{UI.tipLabel[lang]}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.tip[lang]}</p>
                  </div>
                </div>
              )}

              {/* Navigate button */}
              {feature.path && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => navigate(feature.path!)}
                >
                  {UI.goTo[lang]} →
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Print CSS injected globally ───────────────────────────────────────────── */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 1.2cm 1.5cm; }
  body * { visibility: hidden; }
  #guide-print-root, #guide-print-root * { visibility: visible; }
  #guide-print-root { position: absolute; left: 0; top: 0; width: 100%; background: white; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .print-card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
  .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .print-cover { margin-bottom: 24px; padding: 24px; border-radius: 12px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; text-align: center; }
  .print-role-badge { display: inline-block; padding: 4px 12px; border-radius: 999px;
    background: rgba(99,102,241,0.2); color: #818cf8; font-size: 11px; font-weight: 600;
    margin-top: 6px; border: 1px solid rgba(99,102,241,0.3); }
}
`;

/* ─── Main Guide Page ───────────────────────────────────────────────────────── */
export default function Guide() {
  const [lang, setLang]       = useState<Lang>('fr');
  const [role, setRole]       = useState<Role>('patient');
  const [query, setQuery]     = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [scrollPct, setScrollPct]   = useState(0);
  const navigate = useNavigate();

  /* Scroll progress tracker */
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total    = el.scrollHeight - el.clientHeight;
      setScrollPct(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Reset after browser print dialog closes */
  useEffect(() => {
    const reset = () => setIsPrinting(false);
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);

  const handleDownloadPDF = useCallback(() => {
    setIsPrinting(true);
    // Allow React to re-render all cards expanded, then trigger print
    setTimeout(() => window.print(), 350);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FEATURES.filter(f => {
      if (f.role !== role) return false;
      if (!q) return true;
      return (
        f.title[lang].toLowerCase().includes(q) ||
        f.description[lang].toLowerCase().includes(q)
      );
    });
  }, [role, lang, query]);

  const langOptions: { key: Lang; label: string }[] = [
    { key: 'fr', label: '🇫🇷 Français' },
    { key: 'ar', label: '🇩🇿 العربية' },
    { key: 'en', label: '🇬🇧 English' },
  ];

  const roleLabel = role === 'patient' ? UI.patientRole[lang] : UI.pharmacistRole[lang];
  const langLabel = lang === 'fr' ? 'Français' : lang === 'ar' ? 'العربية' : 'English';

  return (
    <div className="min-h-screen bg-background" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Inject print styles */}
      <style>{PRINT_CSS}</style>

      {/* ── Reading progress bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/10 no-print" aria-hidden="true">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-cyan-400 to-primary origin-left"
          style={{ width: `${scrollPct}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      {/* ── Print-only cover (hidden on screen) ── */}
      <div className="print-cover hidden" style={{ display: 'none' }} id="print-cover-hack">
        <div className="print-cover" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>PharMinds Algeria</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '8px 0' }}>{UI.heroTitle[lang]}</h1>
          <p style={{ fontSize: 13, color: '#cbd5e1' }}>{UI.heroSub[lang]}</p>
          <div style={{ marginTop: 12 }}>
            <span className="print-role-badge">
              {roleLabel} · {langLabel} · {new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Everything below here is captured for PDF ── */}
      <div id="guide-print-root">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />

        {/* Back button — top left */}
        <div className="relative z-10 px-4 pt-5 no-print">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors group w-fit"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            {lang === 'ar' ? 'رجوع' : lang === 'en' ? 'Go back' : 'Retour'}
          </button>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 text-center space-y-5">

          {/* Language switcher */}
          <div className="flex items-center justify-center gap-1">
            {langOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setLang(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  lang === key
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <span className="text-primary text-xs font-bold uppercase tracking-widest">PharMinds Algeria</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {UI.heroTitle[lang]}
            </h1>
            <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
              {UI.heroSub[lang]}
            </p>
          </div>

          {/* Search + Download PDF */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-sm mx-auto no-print">
            <div className="relative flex-1 w-full">
              <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={UI.searchPlaceholder[lang]}
                className={`${lang === 'ar' ? 'pr-9 text-right' : 'pl-9'} bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-white/30`}
              />
            </div>
            <Button
              onClick={handleDownloadPDF}
              disabled={isPrinting}
              size="sm"
              className="shrink-0 gap-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur-sm"
              variant="outline"
            >
              {isPrinting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />
              }
              {lang === 'ar' ? 'تحميل PDF' : lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-4 no-print">
          {(['patient', 'pharmacist'] as Role[]).map(r => {
            const isActive = role === r;
            const color = r === 'patient' ? 'cyan' : 'primary';
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                  isActive
                    ? r === 'patient'
                      ? 'border-cyan-500 bg-cyan-500/8 shadow-lg shadow-cyan-500/10'
                      : 'border-primary bg-primary/8 shadow-lg shadow-primary/10'
                    : 'border-border/60 bg-card hover:border-border hover:bg-secondary/30'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  isActive
                    ? r === 'patient' ? 'bg-cyan-500/20' : 'bg-primary/20'
                    : 'bg-secondary/60'
                }`}>
                  {r === 'patient'
                    ? <Users className={`w-6 h-6 transition-colors ${isActive ? 'text-cyan-500' : 'text-muted-foreground'}`} />
                    : <Stethoscope className={`w-6 h-6 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  }
                </div>
                <div className="text-center">
                  <p className={`font-semibold text-sm transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {r === 'patient' ? UI.patientRole[lang] : UI.pharmacistRole[lang]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {FEATURES.filter(f => f.role === r).length} {UI.featuresCount[lang]}
                  </p>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="role-dot"
                    className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} w-2 h-2 rounded-full ${r === 'patient' ? 'bg-cyan-500' : 'bg-primary'}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Results count when searching */}
        {query && (
          <p className="text-xs text-muted-foreground no-print">
            {filtered.length} {UI.featuresCount[lang]}
          </p>
        )}

        {/* Feature grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">{UI.noResults[lang]}</p>
          </div>
        ) : (
          <motion.div layout className="grid md:grid-cols-2 gap-4 print-grid">
            <AnimatePresence mode="popLayout">
              {filtered.map((f, i) => (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="h-full"
                >
                  <FeatureCard feature={f} lang={lang} forceOpen={isPrinting} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          {lang === 'ar'
            ? 'PharMinds Algeria · دليل المستخدم · جميع الحقوق محفوظة'
            : lang === 'en'
            ? 'PharMinds Algeria · User Guide · All rights reserved'
            : 'PharMinds Algeria · Guide Utilisateur · Tous droits réservés'
          }
        </p>
      </div>

      {/* Close guide-print-root */}
      </div>
    </div>
  );
}
