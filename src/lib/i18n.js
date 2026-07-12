import { useSelector, useDispatch } from 'react-redux';
import { setLanguage } from '../Redux/languageSlice';

const translations = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.cars': 'Nos voitures',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.admin': 'Admin',
    'nav.book': 'Réserver',

    // Hero
    'hero.tagline': 'Location Premium',
    'hero.title1': 'Conduisez le',
    'hero.title2': 'luxe',
    'hero.subtitle': 'Découvrez notre collection de véhicules haut de gamme. Réservation simple, service exceptionnel.',
    'hero.cta.book': 'Réserver maintenant',
    'hero.cta.fleet': 'Voir la collection',

    // Features
    'features.title': 'Une expérience unique',
    'features.subtitle': 'Nous repensons la location de voiture pour la rendre simple, rapide et agréable.',
    'f1.title': 'Véhicules premium',
    'f1.desc': 'Une collection exclusive entretenue avec soin.',
    'f2.title': 'Réservation rapide',
    'f2.desc': 'Formulaire simple en moins de 60 secondes.',
    'f3.title': 'Support 24/7',
    'f3.desc': 'Une équipe dédiée à votre service.',

    // Cars
    'cars.title': 'Notre collection',
    'cars.subtitle': 'Choisissez parmi nos véhicules premium',
    'cars.year': 'Année',
    'cars.color': 'Couleur',
    'cars.type': 'Transmission',
    'cars.automatic': 'Automatique',
    'cars.manual': 'Manuelle',
    'cars.perDay': '/jour',
    'cars.book': 'Réserver',

    // Booking
    'book.title': 'Réservez votre véhicule',
    'book.car': 'Véhicule',
    'book.name': 'Nom complet',
    'book.email': 'Email',
    'book.phone': 'Téléphone',
    'book.start': 'Date de début',
    'book.end': 'Date de fin',
    'book.notes': 'Notes (optionnel)',
    'book.total': 'Total',
    'book.submit': 'Confirmer la réservation',
    'book.success': 'Réservation confirmée ! Nous vous contacterons sous 24h.',

    // About
    'about.title': 'Notre histoire',
    'about.lead': 'Depuis 2008, nous révolutionnons la location de voiture au Maroc et en France.',

    // Contact
    'contact.title': 'Contactez-nous',
    'contact.subtitle': 'Une question ? Notre équipe est là pour vous répondre.',
    'contact.address': '12 Avenue de l\'Opéra, 75001 Paris',
    'contact.phone': '+212 1 23 45 67 89',
    'contact.email': 'contact@atlasrent.fr',
    'contact.hours': 'Lun-Ven: 9h-19h, Sam: 10h-17h',

    // Footer
    'footer.tagline': 'La location premium, accessible à tous.',
    'footer.rights': 'Tous droits réservés.',

    // Auth
    'auth.title': 'Administration',
    'auth.subtitle': 'Connectez-vous à votre espace',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.signin': 'Se connecter',
    'auth.signout': 'Déconnexion',
    'auth.demo': 'Démo: admin@rental.com / Admin123!',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.cars': 'سياراتنا',
    'nav.about': 'حول',
    'nav.contact': 'اتصل بنا',
    'nav.admin': 'المشرف',
    'nav.book': 'احجز',

    // Hero
    'hero.tagline': 'تأجير فاخر',
    'hero.title1': 'قد',
    'hero.title2': 'الفخامة',
    'hero.subtitle': 'اكتشف مجموعتنا من السيارات الراقية. حجز بسيط، خدمة استثنائية.',
    'hero.cta.book': 'احجز الآن',
    'hero.cta.fleet': 'شاهد المجموعة',

    // Features
    'features.title': 'تجربة فريدة',
    'features.subtitle': 'نعيد تعريف تأجير السيارات لنجعله بسيطاً وسريعاً وممتعاً.',
    'f1.title': 'سيارات فاخرة',
    'f1.desc': 'مجموعة حصرية يتم صيانته بعناية.',
    'f2.title': 'حجز سريع',
    'f2.desc': 'نموذج بسيط في أقل من 60 ثانية.',
    'f3.title': 'دعم 24/7',
    'f3.desc': 'فريق مخصص لخدمتك.',

    // Cars
    'cars.title': 'مجموعتنا',
    'cars.subtitle': 'اختر من بين سياراتنا الفاخرة',
    'cars.year': 'السنة',
    'cars.color': 'اللون',
    'cars.type': 'ناقل الحركة',
    'cars.automatic': 'أوتوماتيك',
    'cars.manual': 'يدوي',
    'cars.perDay': '/يوم',
    'cars.book': 'احجز',

    // Booking
    'book.title': 'احجز سيارتك',
    'book.car': 'السيارة',
    'book.name': 'الاسم الكامل',
    'book.email': 'البريد الإلكتروني',
    'book.phone': 'الهاتف',
    'book.start': 'تاريخ البداية',
    'book.end': 'تاريخ النهاية',
    'book.notes': 'ملاحظات (اختياري)',
    'book.total': 'المجموع',
    'book.submit': 'تأكيد الحجز',
    'book.success': 'تم تأكيد الحجز! سنتصل بك خلال 24 ساعة.',

    // About
    'about.title': 'قصتنا',
    'about.lead': 'منذ عام 2012 نغير عالم تأجير السيارات في المغرب.',

    // Contact
    'contact.title': 'اتصل بنا',
    'contact.subtitle': 'لديك سؤال؟ فريقنا في انتظارك.',
    'contact.address': '12 شارع الأوبرا، 75001 باريس',
    'contact.phone': '+33 1 23 45 67 89',
    'contact.email': 'contact@atlasrent.fr',
    'contact.hours': 'الإثنين-الجمعة: 9-19، السبت: 10-17',

    // Footer
    'footer.tagline': 'التأجير الفاخر في متناول الجميع.',
    'footer.rights': 'جميع الحقوق محفوظة.',

    // Auth
    'auth.title': 'الإدارة',
    'auth.subtitle': 'تسجيل الدخول إلى مساحتك',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.signin': 'تسجيل الدخول',
    'auth.signout': 'تسجيل الخروج',
    'auth.demo': 'تجريبي: admin@rental.com / Admin123!',
  },
};

export function useI18n() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.language?.lang || 'fr');

  const setLang = (newLang) => {
    dispatch(setLanguage(newLang));
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const t = (key) => {
    return translations[lang]?.[key] || key;
  };

  return { t, lang, setLang };
}