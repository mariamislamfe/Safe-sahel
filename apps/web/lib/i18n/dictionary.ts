import type { Locale } from "@safe-sahel/types";

/**
 * Plain dictionary, not a routing i18n setup — matches the existing
 * cookie-based locale (see lib/locale.ts), no /en /ar URL segments.
 * Safe to import in both Server and Client Components since it's just data.
 *
 * Guest browsing surfaces live here. Booking flow, owner dashboard and
 * admin dashboard strings live in common.ts / guest.ts / owner.ts /
 * admin.ts / listing-form.ts alongside this file.
 *
 * Arabic copy is written in everyday Egyptian-inflected Arabic on purpose —
 * not formal fusha, not jokey either.
 */
export const dictionary = {
  en: {
    nav: {
      explore: "Explore",
      stays: "Stays",
      locations: "Locations",
      favorites: "Favorites",
      bookings: "Bookings",
      hosting: "Hosting",
      profile: "Profile",
      admin: "Admin",
      listProperty: "List your property",
      logIn: "Log in",
      signUp: "Sign up",
      signOut: "Sign out",
    },
    footer: {
      tagline: "Chalets and villas on Egypt's North Coast, booked directly from owners.",
      explore: "Explore",
      hosting: "Hosting",
      support: "Support",
      account: "Your account",
      getVerified: "Get verified",
      rights: "All rights reserved.",
    },
    home: {
      kicker: "Safe Sahel",
      title: "Yalla, we're live! Find your stay on the coast now.",
      lede: "Chalets and villas across Egypt's North Coast, booked directly from verified owners — zero commission.",
      trust: {
        verifiedTitle: "Verified owners",
        verifiedBody: "Every owner is checked: National ID + proof of ownership.",
        directTitle: "Direct with the owner",
        directBody: "Send a request; once the owner confirms, you talk on WhatsApp. No commission.",
        depositTitle: "Clear deposit terms",
        depositBody: "Clear deposit terms + a check-in condition checklist you both confirm.",
      },
      exploreStays: "Explore stays",
      exploreByLocation: "Explore by location",
      exploreByLocationSubtitle: "Starting with our focus compounds",
      comingSoon: "Coming soon",
      staysCount: (n: number) => `${n} ${n === 1 ? "stay" : "stays"}`,
      featuredTitle: "Featured stays",
      newOnSafeSahel: "New on Safe Sahel",
      topRated: "Top rated stays",
      topRatedSubtitle: "Loved by past guests",
      noStaysTitle: "No stays published yet",
      noStaysBody: "Once owners publish properties, they'll show up here.",
      listFirst: "List the first property →",
      ctaTitle: "Got a place on the coast?",
      ctaBody:
        "List it on Safe Sahel and get booking requests directly — zero commission, full control over your calendar.",
      ctaButton: "Register as a Founding Host",
      founderBadge: "Founding Host offer",
      founderOffer: "Completely free until April. Register now and get Founding Host perks.",
      founderPerks: [
        "Launch prices locked for 2 years",
        "First month of Featured free",
        "Founding Host badge",
      ],
      guarantee:
        "If you don't get a single booking request in the first 30 days of a Season plan, next month is on us.",
      seeAll: "See all →",
      categories: {
        villa: "Villas",
        chalet: "Chalets",
        apartment: "Apartments",
        hotel: "Hotels",
      },
    },
    search: {
      title: "All stays",
      titleInLocation: (location: string) => `Stays in ${location}`,
      resultCount: (n: number) => `${n} place${n === 1 ? "" : "s"} to stay on the North Coast.`,
      noResultsTitle: "No properties match your filters",
      noResultsBody: "Try widening your search, or check back soon — new stays are added often.",
      list: "List",
      map: "Map",
    },
    property: {
      guests: "guests",
      bed: "bed",
      beds: "beds",
      from: "From",
      perNight: "/ night",
      verified: "Verified",
      featured: "Featured",
      dayUse: "Day use",
      noPhoto: "No photo yet",
    },
    propertyDetail: {
      showAllPhotos: (n: number) => `+${n} photos`,
      photoOf: (i: number, n: number) => `Photo ${i} of ${n}`,
      size: "m²",
      beds: "beds",
      bedrooms: "bedrooms",
      bathrooms: "bathrooms",
      guests: "guests",
      aboutTitle: "About this place",
      protectionTitle: "Why book through Safe Sahel",
      protectionItems: [
        "Every owner is verified with their National ID and proof of ownership — look for the Verified Owner badge.",
        "Send a booking request. Once the owner confirms, you get their WhatsApp and their legal name to check against InstaPay.",
        "Clear deposit terms and a check-in condition checklist that you and the owner both confirm. Safe Sahel never holds your money.",
      ],
      checkInTitle: "Check-in",
      villageEntryTitle: "Getting into the compound",
      beachAccessTitle: "Beach access",
      amenitiesTitle: "What this place offers",
      amenityCategories: {
        general: "General",
        bathroomSpa: "Bathroom & spa",
        kitchenDining: "Kitchen & dining",
        safetyAccessibility: "Safety & accessibility",
        entertainment: "Entertainment",
      },
      houseRulesTitle: "House rules",
      houseRules: {
        pets: "Pets",
        parties: "Parties or events",
        smoking: "Smoking",
        commercialPhotography: "Commercial photography",
      },
      allowed: "Allowed",
      notAllowed: "Not allowed",
      cancellationTitle: "Cancellation policy",
      cancellationPolicies: {
        flexible: {
          label: "Flexible",
          description: "Full refund if you cancel at least 3 days before check-in.",
        },
        moderate: {
          label: "Moderate",
          description: "Full refund if you cancel at least 7 days before check-in.",
        },
        strict: {
          label: "Strict",
          description: "Deposit is non-refundable within 14 days of check-in.",
        },
      },
      faqTitle: "Frequently asked questions",
      faqItems: [
        {
          question: "How does the deposit work?",
          answer:
            "You pay the deposit and rent directly to the owner by InstaPay or cash — Safe Sahel never holds money. Only transfer after the owner confirms, and only if the InstaPay recipient name matches the legal name we show you.",
        },
        {
          question: "Can I talk to the owner before booking?",
          answer:
            "Send a booking request and put any questions in the note. Once the owner confirms, a WhatsApp button appears so you can talk directly.",
        },
        {
          question: "What if the owner declines or doesn't reply?",
          answer:
            "Nothing was paid through us, so there's nothing to refund — just request another place. Requests with no reply expire after 24 hours, and your dates are never marked as booked until the owner confirms.",
        },
        {
          question: "What does “Verified Owner” mean?",
          answer:
            "Our team checked the owner's National ID and proof of ownership (compound card or maintenance bill). It isn't a guarantee of the stay itself — check photos and reviews too.",
        },
      ],
      reviewsTitle: "Reviews",
      ratingBreakdown: {
        excellent: "Excellent",
        veryGood: "Very good",
        good: "Good",
        poor: "Poor",
        veryPoor: "Very poor",
      },
      noReviewsYet: "No reviews yet — be the first to stay and share how it went.",
      loginToReviewPrompt: "You need to log in to leave a review.",
      loginToReviewCta: "Log in",
      reviewFromBookings: "You can leave a review from your bookings page after your stay.",
    },
    budgetPlanner: {
      fabLabel: "Plan by budget",
      title: "What can I book with this?",
      intro:
        "Tell us your budget and we'll show you real stays you can afford — and how many nights.",
      inputLabel: "Your budget (EGP)",
      submit: "Find stays",
      loading: "Searching…",
      nightsLabel: (n: number) => `${n} night${n === 1 ? "" : "s"}`,
      total: "Total",
      emptyTitle: "Nothing fits that budget yet",
      emptyBody: "Try a higher amount, or check back as more owners publish.",
      resultsIntro: "Here's what fits your budget:",
    },
  },
  ar: {
    nav: {
      explore: "استكشف",
      stays: "الإقامات",
      locations: "الأماكن",
      favorites: "المفضلة",
      bookings: "حجوزاتي",
      hosting: "الاستضافة",
      profile: "حسابي",
      admin: "الإدارة",
      listProperty: "أضف عقارك",
      logIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      signOut: "تسجيل الخروج",
    },
    footer: {
      tagline: "شاليهات وفيلات على الساحل الشمالي، بالحجز المباشر من أصحابها.",
      explore: "استكشف",
      hosting: "الاستضافة",
      support: "تواصل معنا",
      account: "حسابك",
      getVerified: "وثّق حسابك",
      rights: "كل الحقوق محفوظة.",
    },
    home: {
      kicker: "سيف الساحل",
      title: "يلا، اطلقنا رسميًا! اعثر على إقامتك في الساحل دلوقتي.",
      lede: "شاليهات وفيلات في كل الساحل الشمالي، بالحجز المباشر من ملاك موثّقين — من غير أي عمولة.",
      trust: {
        verifiedTitle: "ملاك موثّقين",
        verifiedBody: "كل مالك بيتوثّق ببطاقته الشخصية وإثبات ملكية.",
        directTitle: "مباشرة مع المالك",
        directBody: "ابعت طلب حجز، وبعد ما المالك يأكد بتكلمه على واتساب. من غير عمولة.",
        depositTitle: "شروط عربون واضحة",
        depositBody: "شروط عربون واضحة + قائمة فحص حالة المكان وقت الاستلام بتأكدوها انتو الاتنين.",
      },
      exploreStays: "استكشف الإقامات",
      exploreByLocation: "استكشف حسب المكان",
      exploreByLocationSubtitle: "بنبدأ بالكمباوندات اللي مركزين عليها",
      comingSoon: "قريباً",
      staysCount: (n: number) => `${n} ${n === 1 ? "إقامة" : "إقامات"}`,
      featuredTitle: "إقامات مميزة",
      newOnSafeSahel: "جديد على سيف الساحل",
      topRated: "الأعلى تقييمًا",
      topRatedSubtitle: "اللي عجبت اللي جربوها",
      noStaysTitle: "لسه مفيش عقارات منشورة",
      noStaysBody: "أول ما الملاك ينشروا عقاراتهم، هتلاقيهم هنا.",
      listFirst: "أضف أول عقار ←",
      ctaTitle: "عندك مكان في الساحل؟",
      ctaBody:
        "اعرضه على سيف الساحل وتوصلك طلبات الحجز مباشرة — من غير أي عمولة، والكالندر في إيدك.",
      ctaButton: "سجّل كمالك مؤسس",
      founderBadge: "عرض المالك المؤسس",
      founderOffer: "مجاناً تماماً لحد أبريل. سجّل دلوقتي واحصل على مميزات المالك المؤسس",
      founderPerks: [
        "أسعار الإطلاق ثابتة لمدة سنتين",
        "أول شهر تمييز (Featured) مجاناً",
        "شارة المالك المؤسس",
      ],
      guarantee: "لو ما جالكش ولا طلب حجز في أول 30 يوم من باقة الموسم، الشهر الجاي علينا",
      seeAll: "شوف الكل ←",
      categories: {
        villa: "فيلات",
        chalet: "شاليهات",
        apartment: "شقق",
        hotel: "فنادق",
      },
    },
    search: {
      title: "كل الإقامات",
      titleInLocation: (location: string) => `إقامات في ${location}`,
      resultCount: (n: number) => `${n} مكان للإقامة في الساحل الشمالي.`,
      noResultsTitle: "مفيش عقارات مطابقة لبحثك",
      noResultsBody: "جرّب توسّع البحث، أو ارجع تاني قريب — بنضيف عقارات جديدة باستمرار.",
      list: "قائمة",
      map: "خريطة",
    },
    property: {
      guests: "ضيوف",
      bed: "سرير",
      beds: "سراير",
      from: "يبدأ من",
      perNight: "/ الليلة",
      verified: "موثّق",
      featured: "مميز",
      dayUse: "استخدام يومي",
      noPhoto: "لسه مفيش صورة",
    },
    propertyDetail: {
      showAllPhotos: (n: number) => `+${n} صورة`,
      photoOf: (i: number, n: number) => `صورة ${i} من ${n}`,
      size: "متر²",
      beds: "سراير",
      bedrooms: "أوض نوم",
      bathrooms: "حمامات",
      guests: "ضيوف",
      aboutTitle: "عن المكان",
      protectionTitle: "ليه تحجز من سيف الساحل",
      protectionItems: [
        "كل مالك بيتوثّق ببطاقته الشخصية وإثبات ملكية — دوّر على شارة «مالك موثّق».",
        "ابعت طلب حجز. بعد ما المالك يأكد، هيظهرلك رقم الواتساب بتاعه واسمه القانوني عشان تطابقه مع InstaPay.",
        "شروط عربون واضحة وقائمة فحص لحالة المكان وقت الاستلام بتأكدوها انت والمالك. سيف الساحل عمرها ما بتمسك فلوسك.",
      ],
      checkInTitle: "الوصول والتسليم",
      villageEntryTitle: "الدخول للكمباوند",
      beachAccessTitle: "الوصول للبحر",
      amenitiesTitle: "المكان بيوفرلك",
      amenityCategories: {
        general: "عام",
        bathroomSpa: "حمام وسبا",
        kitchenDining: "مطبخ وأكل",
        safetyAccessibility: "أمان وسهولة وصول",
        entertainment: "ترفيه",
      },
      houseRulesTitle: "قواعد المكان",
      houseRules: {
        pets: "الحيوانات الأليفة",
        parties: "الحفلات والمناسبات",
        smoking: "التدخين",
        commercialPhotography: "تصوير تجاري",
      },
      allowed: "مسموح",
      notAllowed: "مش مسموح",
      cancellationTitle: "سياسة الإلغاء",
      cancellationPolicies: {
        flexible: {
          label: "مرنة",
          description: "استرداد كامل لو لغيت الحجز قبل الوصول بـ3 أيام على الأقل.",
        },
        moderate: {
          label: "متوسطة",
          description: "استرداد كامل لو لغيت الحجز قبل الوصول بأسبوع على الأقل.",
        },
        strict: {
          label: "صارمة",
          description: "العربون مش قابل للاسترداد لو الإلغاء في آخر 14 يوم قبل الوصول.",
        },
      },
      faqTitle: "أسئلة بتتكرر",
      faqItems: [
        {
          question: "العربون بيشتغل ازاي؟",
          answer:
            "العربون والإيجار بيتدفعوا للمالك مباشرة بـ InstaPay أو كاش — سيف الساحل مبتمسكش فلوس. حوّل بس بعد ما المالك يأكد، وبس لو اسم المستلم في InstaPay هو نفس الاسم القانوني اللي بنوريهولك.",
        },
        {
          question: "أقدر أكلم المالك قبل ما أحجز؟",
          answer:
            "ابعت طلب حجز واكتب أسئلتك في الملاحظات. أول ما المالك يأكد، هيظهرلك زرار واتساب تكلمه منه على طول.",
        },
        {
          question: "لو المالك رفض أو مردّش؟",
          answer:
            "مفيش فلوس اتدفعت عن طريقنا، فمفيش حاجة تترجع — ابعت طلب لمكان تاني. الطلبات اللي محدش رد عليها بتنتهي بعد ٢٤ ساعة، والتواريخ مبتتحجزش غير لما المالك يأكد.",
        },
        {
          question: "يعني ايه «مالك موثّق»؟",
          answer:
            "فريقنا اتأكد من بطاقة المالك الشخصية وإثبات الملكية (كارنيه الكمباوند أو إيصال الصيانة). ده مش ضمان للإقامة نفسها — اتأكد من الصور والتقييمات كمان.",
        },
      ],
      reviewsTitle: "التقييمات",
      ratingBreakdown: {
        excellent: "ممتاز",
        veryGood: "جيد جدًا",
        good: "جيد",
        poor: "ضعيف",
        veryPoor: "ضعيف جدًا",
      },
      noReviewsYet: "لسه مفيش تقييمات — كن أول واحد يجرب المكان ويقول رأيه.",
      loginToReviewPrompt: "لازم تسجل دخول عشان تقدر تقيّم.",
      loginToReviewCta: "تسجيل الدخول",
      reviewFromBookings: "تقدر تقيّم من صفحة حجوزاتك بعد ما تخلّص إقامتك.",
    },
    budgetPlanner: {
      fabLabel: "خطط بميزانيتك",
      title: "أقدر أحجز بيها ايه؟",
      intro: "قول لنا معاك كام، وهنوريك إقامات حقيقية تقدر تحجزها بيهم — وكام ليلة.",
      inputLabel: "معاك كام (جنيه)",
      submit: "دور على إقامات",
      loading: "بنبحث…",
      nightsLabel: (n: number) => `${n} ${n === 1 ? "ليلة" : "ليالي"}`,
      total: "الإجمالي",
      emptyTitle: "لسه مفيش حاجة تناسب المبلغ دا",
      emptyBody: "جرّب مبلغ أكبر، أو ارجع تاني قريب مع زيادة العقارات المنشورة.",
      resultsIntro: "دا اللي معاك ينفع تحجزه:",
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionary[locale];
}
