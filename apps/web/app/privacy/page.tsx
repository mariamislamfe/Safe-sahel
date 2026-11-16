import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Privacy policy · Safe Sahel",
  description:
    "How Safe Sahel collects, protects and deletes personal data, including National ID documents.",
};

// TODO(founder): have an Egyptian lawyer review this against PDPL 151/2020
// and its executive regulations, and fill in the registered company name,
// address and the Data Protection Officer contact once appointed.
const content = {
  en: {
    title: "Privacy policy",
    updated: "Last updated: November 2026",
    sections: [
      {
        h: "Who we are",
        p: [
          "Safe Sahel is a listing platform connecting guests with verified owners of chalets and villas on Egypt's North Coast. We never hold or process rent or deposit payments — guests pay owners directly.",
          "We process personal data in line with Egypt's Personal Data Protection Law No. 151 of 2020.",
        ],
      },
      {
        h: "What we collect",
        p: [
          "Account data: name, email, phone number.",
          "Owner and broker verification: National ID, proof of ownership (compound card or maintenance bill) and, for brokers, the owner's authorization for each listing. Your legal name from your ID is shown only to guests whose booking you confirmed, so they can check it against the InstaPay recipient.",
          "Guest IDs: the National ID of each adult guest on a confirmed booking, needed by compounds to issue gate passes.",
          "Payment proofs: screenshots and InstaPay references owners submit for subscriptions.",
          "Usage data: listing views, WhatsApp-button clicks and booking requests, linked to an anonymous browser identifier — used for owner reports and to improve the service.",
        ],
      },
      {
        h: "How ID documents are protected",
        p: [
          "ID documents are stored in private storage and are never available through public links.",
          "They are opened only through links that expire after 60 seconds, created after a permission check.",
          "Guest IDs can be seen only by Safe Sahel administrators and by the owner of that specific confirmed booking. Owner and broker documents can be seen only by administrators.",
          "Every time an ID document is opened we record who opened it, when, and which file.",
        ],
      },
      {
        h: "How long we keep data",
        p: [
          "Guest ID files are deleted automatically 30 days after check-out. A guest can also remove an uploaded ID at any time from their booking page.",
          "Verification documents are kept while your listing is active and for as long as needed to resolve disputes or meet legal obligations.",
          "Booking and account records are kept to operate the service and meet legal obligations; we archive rather than delete listings so history stays accurate.",
        ],
      },
      {
        h: "Consent and your rights",
        p: [
          "We ask for your explicit consent before any ID document is uploaded. You may withdraw consent; this may prevent issuing a gate pass or keeping a listing verified.",
          "You can request access to, correction of, or deletion of your personal data by contacting us on WhatsApp +20 112 309 4983.",
        ],
      },
      {
        h: "Sharing",
        p: [
          "We share guest IDs only with the owner of the confirmed booking for the purpose of compound gate passes. We do not sell personal data.",
          "Service providers (hosting, database, email) process data on our behalf under appropriate safeguards.",
        ],
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: نوفمبر ٢٠٢٦",
    sections: [
      {
        h: "إحنا مين",
        p: [
          "سيف الساحل منصة بتوصّل الضيوف بملاك موثّقين لشاليهات وفيلات في الساحل الشمالي. إحنا عمرنا ما بنمسك أو بنحصّل فلوس الإيجار أو العربون — الضيف بيدفع للمالك مباشرة.",
          "بنتعامل مع البيانات الشخصية طبقاً لقانون حماية البيانات الشخصية المصري رقم ١٥١ لسنة ٢٠٢٠.",
        ],
      },
      {
        h: "بنجمع إيه",
        p: [
          "بيانات الحساب: الاسم، الإيميل، رقم التليفون.",
          "توثيق الملاك والوسطاء: البطاقة الشخصية، إثبات الملكية (كارنيه الكمباوند أو إيصال الصيانة)، ولكل إعلان وسيط تفويض من المالك. اسمك القانوني من البطاقة بيظهر بس للضيف اللي أكدت حجزه، عشان يطابقه مع اسم المستلم في InstaPay.",
          "بطايق الضيوف: بطاقة كل ضيف بالغ في حجز مؤكد، لأن الكمباوندات محتاجاها لتصاريح البوابة.",
          "إثباتات الدفع: صور ورقم عمليات InstaPay اللي الملاك بيبعتوها للاشتراك.",
          "بيانات الاستخدام: مشاهدات الإعلانات، ضغطات زرار الواتساب وطلبات الحجز، مربوطة بمعرّف مجهول للمتصفح — بنستخدمها في تقارير الملاك وتحسين الخدمة.",
        ],
      },
      {
        h: "إزاي بنحمي البطايق",
        p: [
          "البطايق متخزنة في مساحة خاصة ومفيش ليها أي لينك عام.",
          "بتتفتح بس من خلال لينك بينتهي بعد ٦٠ ثانية، وبيتعمل بعد التأكد من الصلاحية.",
          "بطايق الضيوف محدش يشوفها غير إدارة سيف الساحل ومالك الحجز المؤكد ده بالتحديد. مستندات الملاك والوسطاء الإدارة بس اللي تشوفها.",
          "كل مرة بطاقة بتتفتح بنسجّل مين فتحها وإمتى وأنهي ملف.",
        ],
      },
      {
        h: "بنحتفظ بالبيانات قد إيه",
        p: [
          "ملفات بطايق الضيوف بتتمسح أوتوماتيك بعد ٣٠ يوم من المغادرة، والضيف يقدر يشيل البطاقة في أي وقت من صفحة الحجز.",
          "مستندات التوثيق بنحتفظ بيها طول ما الإعلان شغال وللمدة اللازمة لحل أي نزاع أو التزام قانوني.",
          "سجلات الحجوزات والحسابات بنحتفظ بيها لتشغيل الخدمة والالتزامات القانونية، والإعلانات بنأرشفها بدل ما نمسحها عشان التاريخ يفضل مظبوط.",
        ],
      },
      {
        h: "الموافقة وحقوقك",
        p: [
          "بنطلب موافقتك الصريحة قبل رفع أي بطاقة. تقدر تسحب موافقتك، وده ممكن يمنع استخراج تصريح البوابة أو بقاء الإعلان موثّق.",
          "تقدر تطلب تشوف بياناتك أو تصححها أو تمسحها من خلال التواصل معانا على واتساب ‎+20 112 309 4983.",
        ],
      },
      {
        h: "المشاركة",
        p: [
          "بنشارك بطايق الضيوف بس مع مالك الحجز المؤكد عشان تصاريح البوابة. إحنا مبنبيعش بيانات شخصية.",
          "مزودي الخدمة (الاستضافة، قاعدة البيانات، الإيميل) بيعالجوا البيانات لصالحنا بضمانات مناسبة.",
        ],
      },
    ],
  },
};

export default async function PrivacyPage() {
  const t = content[await getLocale()];
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-xl px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.updated}</p>
      </div>
      {t.sections.map((section) => (
        <section key={section.h} className="flex flex-col gap-sm">
          <h2 className="font-display text-lg font-semibold">{section.h}</h2>
          <ul className="flex flex-col gap-xs">
            {section.p.map((p) => (
              <li key={p} className="leading-relaxed text-ink-secondary">
                {p}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
