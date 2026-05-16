import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'fr' | 'ar';

interface Translations {
  [key: string]: {
    fr: string;
    ar: string;
  };
}

// Comprehensive translations for the app
export const translations: Translations = {
  // Common
  'app.name': { fr: 'PharMinds', ar: 'فارمايندز' },
  'app.tagline': { fr: 'Pharmacies Intelligentes d\'Algérie', ar: 'صيدليات الجزائر الذكية' },
  'common.loading': { fr: 'Chargement...', ar: 'جاري التحميل...' },
  'common.save': { fr: 'Enregistrer', ar: 'حفظ' },
  'common.cancel': { fr: 'Annuler', ar: 'إلغاء' },
  'common.delete': { fr: 'Supprimer', ar: 'حذف' },
  'common.edit': { fr: 'Modifier', ar: 'تعديل' },
  'common.add': { fr: 'Ajouter', ar: 'إضافة' },
  'common.search': { fr: 'Rechercher', ar: 'بحث' },
  'common.back': { fr: 'Retour', ar: 'رجوع' },
  'common.next': { fr: 'Suivant', ar: 'التالي' },
  'common.previous': { fr: 'Précédent', ar: 'السابق' },
  'common.close': { fr: 'Fermer', ar: 'إغلاق' },
  'common.yes': { fr: 'Oui', ar: 'نعم' },
  'common.no': { fr: 'Non', ar: 'لا' },

  // Navigation
  'nav.home': { fr: 'Accueil', ar: 'الرئيسية' },
  'nav.dashboard': { fr: 'Tableau de Bord', ar: 'لوحة التحكم' },
  'nav.medications': { fr: 'Médicaments', ar: 'الأدوية' },
  'nav.ordonnances': { fr: 'Ordonnances', ar: 'الوصفات الطبية' },
  'nav.carteChifa': { fr: 'Carte Chifa', ar: 'بطاقة الشفاء' },
  'nav.profile': { fr: 'Mon Profil', ar: 'ملفي الشخصي' },
  'nav.assistant': { fr: 'Assistant IA', ar: 'المساعد الذكي' },
  'nav.logout': { fr: 'Déconnexion', ar: 'تسجيل الخروج' },

  // Auth
  'auth.login': { fr: 'Connexion', ar: 'تسجيل الدخول' },
  'auth.signup': { fr: 'Inscription', ar: 'إنشاء حساب' },
  'auth.email': { fr: 'Email', ar: 'البريد الإلكتروني' },
  'auth.password': { fr: 'Mot de passe', ar: 'كلمة المرور' },
  'auth.fullName': { fr: 'Nom Complet', ar: 'الاسم الكامل' },
  'auth.noAccount': { fr: "Pas de compte ? S'inscrire", ar: 'ليس لديك حساب؟ سجل الآن' },
  'auth.hasAccount': { fr: 'Déjà un compte ? Se connecter', ar: 'لديك حساب؟ تسجيل الدخول' },
  'auth.loginSuccess': { fr: 'Connexion réussie', ar: 'تم تسجيل الدخول بنجاح' },
  'auth.signupSuccess': { fr: 'Compte créé avec succès', ar: 'تم إنشاء الحساب بنجاح' },
  'auth.loginError': { fr: 'Email ou mot de passe incorrect', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
  'auth.logoutSuccess': { fr: 'Déconnexion réussie', ar: 'تم تسجيل الخروج بنجاح' },

  // Hero Section
  'hero.badge': { fr: 'Plateforme pour les Pharmacies Algériennes', ar: 'منصة للصيدليات الجزائرية' },
  'hero.title1': { fr: 'PHAR', ar: 'فار' },
  'hero.title2': { fr: 'MINDS', ar: 'مايندز' },
  'hero.subtitle': { fr: 'Gestion intelligente des médicaments, détection des interactions et suivi des patients.', ar: 'إدارة ذكية للأدوية، كشف التفاعلات ومتابعة المرضى.' },
  'hero.subtitleBold': { fr: 'Conçu spécialement pour les pharmacies algériennes.', ar: 'مصمم خصيصاً للصيدليات الجزائرية.' },
  'hero.pharmacist': { fr: 'Espace Pharmacien', ar: 'مساحة الصيدلي' },
  'hero.patient': { fr: 'Espace Patient', ar: 'مساحة المريض' },
  'hero.admin': { fr: 'Administration', ar: 'الإدارة' },

  // Stats
  'stats.accuracy': { fr: 'Détection des Interactions', ar: 'كشف التفاعلات' },
  'stats.verificationTime': { fr: 'Scanner une Ordonnance', ar: 'مسح وصفة طبية' },
  'stats.emergencyOrders': { fr: 'Suivi du Stock', ar: 'متابعة المخزون' },
  'stats.adherence': { fr: 'Multilingue FR/AR', ar: 'متعدد اللغات فر/عر' },

  // Features
  'feature.ai': { fr: 'Vérification des Interactions', ar: 'فحص التفاعلات الدوائية' },
  'feature.inventory': { fr: 'Gestion du Stock', ar: 'إدارة المخزون' },
  'feature.safety': { fr: 'Sécurité des Patients', ar: 'سلامة المرضى' },

  // Patient Dashboard
  'patient.welcome': { fr: 'Bienvenue', ar: 'مرحباً' },
  'patient.manageHealth': { fr: 'Gérez votre santé et suivez vos traitements', ar: 'أدر صحتك وتابع علاجاتك' },
  'patient.activeMeds': { fr: 'Médicaments Actifs', ar: 'الأدوية النشطة' },
  'patient.ordonnances': { fr: 'Ordonnances', ar: 'الوصفات' },
  'patient.quickActions': { fr: 'Actions Rapides', ar: 'إجراءات سريعة' },
  'patient.recentActivity': { fr: 'Activité Récente', ar: 'النشاط الأخير' },
  'patient.noActivity': { fr: 'Aucune activité récente', ar: 'لا يوجد نشاط حديث' },

  // Carte Chifa
  'chifa.title': { fr: 'Carte Chifa', ar: 'بطاقة الشفاء' },
  'chifa.description': { fr: "Gérez votre carte d'assurance maladie CNAS", ar: 'أدر بطاقة التأمين الصحي CNAS' },
  'chifa.cardNumber': { fr: 'Numéro de Carte', ar: 'رقم البطاقة' },
  'chifa.holder': { fr: 'Titulaire', ar: 'صاحب البطاقة' },
  'chifa.birthDate': { fr: 'Date de Naissance', ar: 'تاريخ الميلاد' },
  'chifa.expiry': { fr: 'Expiration', ar: 'تاريخ الانتهاء' },
  'chifa.coverage': { fr: 'Type de Couverture', ar: 'نوع التغطية' },
  'chifa.noCard': { fr: 'Aucune Carte Chifa', ar: 'لا توجد بطاقة شفاء' },
  'chifa.addCard': { fr: 'Ajouter ma Carte', ar: 'إضافة بطاقتي' },
  'chifa.active': { fr: 'Active', ar: 'نشطة' },
  'chifa.registered': { fr: 'Enregistrée', ar: 'مسجلة' },
  'chifa.notConfigured': { fr: 'Non configurée', ar: 'غير مهيأة' },

  // Ordonnances
  'ordonnance.title': { fr: 'Mes Ordonnances', ar: 'وصفاتي الطبية' },
  'ordonnance.description': { fr: 'Gérez vos prescriptions médicales', ar: 'أدر وصفاتك الطبية' },
  'ordonnance.new': { fr: 'Nouvelle Ordonnance', ar: 'وصفة جديدة' },
  'ordonnance.doctor': { fr: 'Nom du Médecin', ar: 'اسم الطبيب' },
  'ordonnance.specialty': { fr: 'Spécialité', ar: 'التخصص' },
  'ordonnance.hospital': { fr: 'Établissement', ar: 'المؤسسة' },
  'ordonnance.date': { fr: 'Date de Prescription', ar: 'تاريخ الوصفة' },
  'ordonnance.medications': { fr: 'Médicaments Prescrits', ar: 'الأدوية الموصوفة' },
  'ordonnance.noOrdonnances': { fr: 'Aucune Ordonnance', ar: 'لا توجد وصفات' },
  'ordonnance.active': { fr: 'Active', ar: 'نشطة' },
  'ordonnance.completed': { fr: 'Complète', ar: 'مكتملة' },
  'ordonnance.expired': { fr: 'Expirée', ar: 'منتهية' },
  'ordonnance.dispensed': { fr: 'Délivré', ar: 'تم الصرف' },

  // Medications
  'medication.title': { fr: 'Mes Médicaments', ar: 'أدويتي' },
  'medication.description': { fr: 'Suivez vos traitements en cours', ar: 'تابع علاجاتك الحالية' },
  'medication.add': { fr: 'Ajouter un Médicament', ar: 'إضافة دواء' },
  'medication.dosage': { fr: 'Dosage', ar: 'الجرعة' },
  'medication.frequency': { fr: 'Fréquence', ar: 'التكرار' },
  'medication.startDate': { fr: 'Date de Début', ar: 'تاريخ البداية' },
  'medication.endDate': { fr: 'Date de Fin', ar: 'تاريخ النهاية' },
  'medication.active': { fr: 'Actif', ar: 'نشط' },
  'medication.finished': { fr: 'Terminé', ar: 'منتهي' },
  'medication.noMedications': { fr: 'Aucun Médicament', ar: 'لا توجد أدوية' },

  // Profile
  'profile.title': { fr: 'Mon Profil', ar: 'ملفي الشخصي' },
  'profile.description': { fr: 'Gérez vos informations personnelles', ar: 'أدر معلوماتك الشخصية' },
  'profile.phone': { fr: 'Téléphone', ar: 'الهاتف' },
  'profile.wilaya': { fr: 'Wilaya', ar: 'الولاية' },
  'profile.language': { fr: 'Langue Préférée', ar: 'اللغة المفضلة' },
  'profile.updated': { fr: 'Profil mis à jour', ar: 'تم تحديث الملف الشخصي' },

  // Algeria Section
  'algeria.title': { fr: 'Conçu pour l\'Algérie', ar: 'مصمم للجزائر' },
  'algeria.subtitle': { fr: 'Parfaitement adapté au système de santé algérien', ar: 'متكيف تماماً مع نظام الصحة الجزائري' },
  'algeria.chifa': { fr: 'Intégration Carte Chifa', ar: 'تكامل بطاقة الشفاء' },
  'algeria.chifaDesc': { fr: 'Vérification CNAS instantanée et remboursement', ar: 'تحقق فوري من CNAS والتعويض' },
  'algeria.language': { fr: 'Support Multilingue', ar: 'دعم متعدد اللغات' },
  'algeria.languageDesc': { fr: 'Français, Arabe et Darija', ar: 'الفرنسية والعربية والدارجة' },
  'algeria.wilayas': { fr: '58 Wilayas Couvertes', ar: '58 ولاية مغطاة' },
  'algeria.wilayasDesc': { fr: 'Déploiement national complet', ar: 'نشر وطني شامل' },

  // Modules Section
  'modules.title': { fr: 'Modules Intelligents', ar: 'الوحدات الذكية' },
  'modules.subtitle': { fr: 'Trois interfaces puissantes, une seule plateforme', ar: 'ثلاث واجهات قوية، منصة واحدة' },

  // Roles Section
  'roles.title': { fr: 'Une Plateforme, Trois Rôles', ar: 'منصة واحدة، ثلاثة أدوار' },
  'roles.subtitle': { fr: 'Chaque utilisateur bénéficie d\'une expérience optimisée', ar: 'كل مستخدم يستفيد من تجربة محسّنة' },

  // CTA Section
  'cta.badge': { fr: 'Commencez avec PharMinds', ar: 'ابدأ مع فارمايندز' },
  'cta.title1': { fr: 'Prêt à moderniser votre', ar: 'هل أنت مستعد لتحديث' },
  'cta.title2': { fr: 'pharmacie', ar: 'صيدليتك' },
  'cta.subtitle': { fr: 'PharMinds vous aide à gérer votre stock, détecter les interactions médicamenteuses et suivre vos patients — le tout depuis une seule plateforme.', ar: 'فارمايندز يساعدك في إدارة مخزونك، كشف التفاعلات الدوائية ومتابعة مرضاك — كل ذلك من منصة واحدة.' },
  'cta.benefit1': { fr: 'Détection des interactions', ar: 'كشف التفاعلات الدوائية' },
  'cta.benefit2': { fr: 'Données sécurisées', ar: 'بيانات آمنة' },
  'cta.benefit3': { fr: 'Support FR/AR', ar: 'دعم فر/عر' },
  'cta.start': { fr: 'Créer un compte', ar: 'إنشاء حساب' },
  'cta.demo': { fr: 'Explorer la plateforme', ar: 'استكشف المنصة' },
  'cta.trust1': { fr: 'Inscription gratuite', ar: 'تسجيل مجاني' },
  'cta.trust2': { fr: 'Interface en français et arabe', ar: 'واجهة بالفرنسية والعربية' },
  'cta.trust3': { fr: 'Conçu pour l\'Algérie', ar: 'مصمم للجزائر' },

  // Testimonials Section
  'testimonials.badge': { fr: 'Fonctionnalités', ar: 'الميزات' },
  'testimonials.title1': { fr: 'Ce que fait', ar: 'ماذا تقدم' },
  'testimonials.title2': { fr: 'PharMinds', ar: 'فارمايندز' },
  'testimonials.subtitle': { fr: 'Une plateforme complète pour la gestion des pharmacies en Algérie', ar: 'منصة شاملة لإدارة الصيدليات في الجزائر' },

  // Footer
  'footer.rights': { fr: 'Tous droits réservés', ar: 'جميع الحقوق محفوظة' },
  'footer.privacy': { fr: 'Confidentialité', ar: 'الخصوصية' },
  'footer.terms': { fr: 'Conditions', ar: 'الشروط' },
  'footer.contact': { fr: 'Contact', ar: 'اتصل بنا' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      return (saved as Language) || 'fr';
    }
    return 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
