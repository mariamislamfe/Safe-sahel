import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Terms & conditions · Safe Sahel",
  description:
    "The rules for guests, owners and brokers on Safe Sahel: what the platform is responsible for, strikes, subscriptions and refunds.",
};

// TODO(founder): have an Egyptian lawyer review these terms (consumer protection
// law 181/2018, e-commerce rules, PDPL 151/2020) and add the registered company
// name, commercial registration number and address before launch.

type Section = { id: string; h: string; p: string[] };

const content: Record<
  "en" | "ar",
  { title: string; updated: string; intro: string; toc: string; sections: Section[] }
> = {
  ar: {
    title: "الشروط والأحكام",
    updated: "آخر تحديث: نوفمبر 2026",
    intro:
      "الشروط دي بتنظم استخدامك لسيف الساحل كضيف أو مالك أو وسيط. لما تعمل حساب أو تعرض مكان أو تبعت طلب حجز، يبقى إنت موافق عليها. اقراها كويس، خصوصاً الجزء الخاص بالإنذارات والاشتراكات.",
    toc: "المحتويات",
    sections: [
      {
        id: "platform",
        h: "1. سيف الساحل بتعمل إيه — ومش بتعمل إيه",
        p: [
          "سيف الساحل منصة إعلانات بتوصّل الضيوف بملاك الشاليهات والفيلات في الساحل الشمالي مباشرة، من غير سماسرة.",
          "إحنا مش طرف في عقد الإيجار. الاتفاق على الإقامة بيبقى بين الضيف والمالك مباشرة.",
          "المنصة عمرها ما بتستلم أو بتمسك أي فلوس إيجار أو عربون (تأمين). الضيف بيدفع للمالك مباشرة بـ InstaPay أو كاش.",
          "دورنا: بنراجع بطاقة المالك وإثبات الملكية قبل ما الإعلان يظهر، وبنحمي بيانات الضيوف، وبنوفر سجل للحجز وقايمة استلام مشتركة تقلل الخلافات.",
          "مراجعة المستندات بتقلل الاحتيال لكنها مش ضمان لحالة المكان أو لسلوك أي طرف. إحنا مش مسؤولين عن أي فلوس بتتحوّل بين الضيف والمالك، ولا عن حالة الوحدة، ولا عن أي ضرر أو خلاف بيحصل أثناء الإقامة، في حدود ما يسمح بيه القانون المصري.",
          "لو حصل خلاف، تقدر تكلمنا ونحاول نساعد في حله ونراجع السجلات، لكن القرار النهائي في الفلوس بيبقى بين الطرفين أو حسب القانون.",
        ],
      },
      {
        id: "accounts",
        h: "2. الحساب",
        p: [
          "لازم يكون عندك 18 سنة أو أكتر، وبياناتك تكون حقيقية وصحيحة.",
          "رقم الموبايل (واتساب) إجباري للملاك والوسطاء، لأن التواصل على الحجز كله بيتم عليه. الإعلان مش هيتنشر من غير رقم. ويُفضّل جداً إن الضيف يضيف رقمه هو كمان.",
          "رقمك مش بيظهر للطرف التاني غير بعد ما المالك يأكد الحجز.",
          "إنت مسؤول عن الحفاظ على كلمة السر، وعن أي حاجة بتحصل من حسابك.",
        ],
      },
      {
        id: "bookings",
        h: "3. طلبات الحجز والدفع",
        p: [
          "طلب الحجز مش حجز مؤكد. المالك عنده 24 ساعة يأكد أو يرفض، ولو مردّش الطلب بيلغى لوحده ومفيش أي فلوس مستحقة.",
          "الأيام بتتقفل في الكالندر بس لما المالك يأكد.",
          "بعد التأكيد بنوريك الاسم القانوني للمالك زي ما هو في بطاقته المتوثقة. حوّل العربون بس لو اسم المستلم في InstaPay هو نفس الاسم بالظبط. لو الاسم مختلف ماتحوّلش وكلّمنا.",
          "العربون بيتدفع للمالك مباشرة. لو الضيف لغى الحجز المؤكد قبل ميعاد الوصول بأقل من 3 أيام، العربون بيضيع. شروط استرجاع العربون بعد الإقامة بتتفق عليها مع المالك.",
          "الضيف بيرفع بطايق البالغين عشان تصاريح بوابة الكمباوند. البطايق دي بتتمسح تلقائياً بعد 30 يوم من المغادرة. تفاصيل حماية البيانات في سياسة الخصوصية.",
        ],
      },
      {
        id: "hosts",
        h: "4. التزامات المالك والوسيط",
        p: [
          "لازم ترفع بطاقتك الشخصية وإثبات ملكية الوحدة (كارنيه الكمباوند أو فاتورة الصيانة). الإعلان مش هيتنشر قبل الموافقة.",
          "الوسيط لازم يرفع تفويض من المالك لكل إعلان على حدة.",
          "بيانات الإعلان والصور والسعر لازم تكون حقيقية ومطابقة للوحدة.",
          "حدّث الكالندر باستمرار واقفل الأيام اللي اتأجرت بره المنصة، عشان الضيوف مايطلبوش أيام مش فاضية.",
          "رد على طلبات الحجز خلال 24 ساعة.",
          "بطايق الضيوف بتستخدمها بس عشان تصاريح البوابة. ممنوع تحتفظ بيها أو تشاركها أو تستخدمها في أي حاجة تانية. وكل مرة بتفتح فيها بطاقة بتتسجل.",
        ],
      },
      {
        id: "strikes",
        h: "5. نظام الإنذارات",
        p: [
          "لو المالك لغى حجز كان أكّده بنفسه، بياخد إنذار تلقائي، والضيف بيتبلغ.",
          'لما يتجمع عند المالك إنذارين ساريين، كل إعلاناته بتتحط تحت مراجعة الإدارة، وممكن يفقد علامة "موثّق".',
          "الإنذارات بتظهرلك في لوحة المالك. لو عندك سبب قاهر (مثلاً عطل في الوحدة يمنع الإقامة)، كلّمنا، والإدارة ممكن تلغي الإنذار بعد ما تراجع الموضوع.",
          "الاحتيال أو المستندات المزورة أو التعامل بشكل مسيء بيعرّض الحساب للإيقاف فوراً، ومن غير ما يمر بنظام الإنذارات.",
        ],
      },
      {
        id: "subscriptions",
        h: "6. الاشتراكات والاسترداد",
        p: [
          "سيف الساحل مابتاخدش عمولة على الحجوزات. المالك بيدفع اشتراك لكل إعلان: شهري، أو موسم (مايو – سبتمبر)، أو سنوي (وبيشمل باقة الطلبة في الشتا).",
          "كل الإعلانات مجانية لحد 1 أبريل 2027. لو اخترت باقة قبل كده، المدة المدفوعة بتبدأ بعد ما الفترة المجانية تخلص.",
          "الدفع بيتم بـ InstaPay مع رفع إثبات التحويل، والاشتراك بيتفعّل بعد ما الإدارة تراجع الدفع وتوافق عليه.",
          "لما الاشتراك يخلص فيه فترة سماح 7 أيام، وبعدها الإعلان بيختفي من البحث لحد ما تجدد.",
          "مفيش استرداد لأي جزء من الباقة بعد تفعيلها، حتى لو وقفت الإعلان أو أرشفته أو قفلت الاستضافة في نص المدة، أو لو الإعلان اتوقف بسبب مخالفة للشروط دي. ده بينطبق برضه على التمييز (Featured).",
          "لو الإدارة رفضت إثبات الدفع (مثلاً المبلغ أو رقم العملية مش مطابق)، الاشتراك مش هيتفعل، وتقدر تتواصل معانا لتسوية التحويل.",
          "ضمان باقة الموسم: لو ماجالكش ولا طلب حجز خلال أول 30 يوم من باقة الموسم، بنضيفلك شهر مجاني. ده التعويض الوحيد، ومش بيترد فلوس.",
          "الأسعار ممكن تتغير، لكن التغيير مش بيأثر على مدة إنت دفعتها خلاص. والملاك المؤسسين (اللي بدأوا الاستضافة قبل 1 أبريل 2027) سعر الإطلاق ثابت ليهم لحد 1 أبريل 2029.",
        ],
      },
      {
        id: "suspension",
        h: "7. إيقاف الإعلانات والحسابات",
        p: [
          "من حقنا نخفي إعلان أو نوقف حساب لو فيه مستندات مزورة، أو بيانات غلط، أو احتيال، أو إنذارات متكررة، أو إساءة لأي مستخدم، أو مخالفة للقانون.",
          "هنبلّغك بالسبب في لوحة المالك أو على الإيميل، إلا لو القانون أو التحقيق في احتيال بيمنع ده.",
        ],
      },
      {
        id: "changes",
        h: "8. تعديل الشروط والتواصل",
        p: [
          "ممكن نعدّل الشروط دي، ولو التعديل جوهري هنبلّغك قبلها. استمرارك في استخدام المنصة بعد التعديل معناه إنك موافق عليه.",
          "الشروط دي خاضعة للقانون المصري.",
          "لأي سؤال أو شكوى: واتساب ‎+20 112 309 4983.",
        ],
      },
    ],
  },
  en: {
    title: "Terms & conditions",
    updated: "Last updated: November 2026",
    intro:
      "These terms govern how you use Safe Sahel as a guest, owner or broker. By creating an account, listing a place or sending a booking request you agree to them. Please read them carefully — especially the strike and subscription sections.",
    toc: "Contents",
    sections: [
      {
        id: "platform",
        h: "1. What Safe Sahel does — and doesn't do",
        p: [
          "Safe Sahel is a listing platform that connects guests directly with owners of chalets and villas on Egypt's North Coast, without brokers in between.",
          "We are not a party to the rental agreement. The stay is agreed directly between guest and owner.",
          "The platform never receives or holds rent or deposit money. Guests pay owners directly via InstaPay or cash.",
          "Our role: we review the owner's ID and proof of ownership before a listing goes live, protect guest data, and provide a booking record and a shared check-in checklist that reduces disputes.",
          "Document review reduces fraud but does not guarantee a property's condition or anyone's behaviour. To the extent permitted by Egyptian law, we are not responsible for money transferred between guest and owner, the condition of the unit, or damage or disputes arising during a stay.",
          "If a dispute arises, contact us — we'll review the records and try to help, but the money is ultimately settled between the two parties or under the law.",
        ],
      },
      {
        id: "accounts",
        h: "2. Your account",
        p: [
          "You must be 18 or older and give accurate information.",
          "A mobile (WhatsApp) number is required for owners and brokers, because all booking coordination happens there — a listing can't be published without one. Guests are strongly encouraged to add theirs too.",
          "Your number is shown to the other side only after the owner confirms the booking.",
          "You are responsible for keeping your password safe and for activity on your account.",
        ],
      },
      {
        id: "bookings",
        h: "3. Booking requests and payment",
        p: [
          "A booking request is not a confirmed booking. The owner has 24 hours to confirm or decline; unanswered requests expire automatically and nothing is owed.",
          "Dates are blocked on the calendar only once the owner confirms.",
          "After confirmation we show you the owner's legal name as it appears on their verified ID. Only transfer the deposit if the InstaPay recipient name matches exactly. If it doesn't, don't transfer — contact us.",
          "The deposit is paid directly to the owner. Cancelling a confirmed booking within 3 days of check-in forfeits it. How the deposit is returned after the stay is agreed with the owner.",
          "Guests upload adult IDs for compound gate passes. These are deleted automatically 30 days after check-out. See the privacy policy for how they are protected.",
        ],
      },
      {
        id: "hosts",
        h: "4. Owner and broker obligations",
        p: [
          "Upload your National ID and proof of ownership (compound card or maintenance bill). Listings are not published before approval.",
          "Brokers must upload the owner's authorization for each listing.",
          "Listing details, photos and prices must be real and match the unit.",
          "Keep your calendar up to date and block dates rented elsewhere, so guests only request free dates.",
          "Reply to booking requests within 24 hours.",
          "Use guest IDs only to issue gate passes. You may not keep, share or use them for anything else. Every view is logged.",
        ],
      },
      {
        id: "strikes",
        h: "5. Strikes",
        p: [
          "If an owner cancels a booking they already confirmed, they automatically receive a strike and the guest is notified.",
          "With 2 active strikes, all of the owner's listings are placed under admin review and the Verified badge may be removed.",
          "Strikes are shown on your host dashboard. If you had a genuine emergency (for example a fault that makes the unit unusable), contact us — an admin may revoke the strike after review.",
          "Fraud, forged documents or abusive behaviour can lead to immediate suspension, outside the strike system.",
        ],
      },
      {
        id: "subscriptions",
        h: "6. Subscriptions and refunds",
        p: [
          "Safe Sahel takes no commission on bookings. Owners pay a subscription per listing: monthly, season (May – September) or annual (includes the student winter plan).",
          "All listings are free until 1 April 2027. If you buy a plan earlier, paid time starts when the free period ends.",
          "Payment is by InstaPay with an uploaded proof; the subscription is activated once an admin reviews and approves the payment.",
          "When a subscription ends there is a 7-day grace period, after which the listing is hidden from search until renewed.",
          "No refunds are given for any unused part of a plan once it is activated — including if you unpublish or archive the listing, turn off hosting mid-plan, or the listing is suspended for breaking these terms. The same applies to Featured placement.",
          "If an admin rejects a payment proof (e.g. the amount or reference doesn't match), the subscription is not activated and you can contact us to settle the transfer.",
          "Season guarantee: if a season-plan listing gets no booking requests in its first 30 days, we add one free month. This is the only remedy; it is not paid out in cash.",
          "Prices may change, but changes never affect a period you have already paid for. Founding Hosts (who started hosting before 1 April 2027) keep the launch price until 1 April 2029.",
        ],
      },
      {
        id: "suspension",
        h: "7. Suspending listings and accounts",
        p: [
          "We may hide a listing or suspend an account for forged documents, false information, fraud, repeated strikes, abuse of other users or illegal activity.",
          "We'll tell you why in your dashboard or by email, unless the law or a fraud investigation prevents it.",
        ],
      },
      {
        id: "changes",
        h: "8. Changes and contact",
        p: [
          "We may update these terms and will notify you in advance of material changes. Continuing to use the platform after a change means you accept it.",
          "These terms are governed by Egyptian law.",
          "Questions or complaints: WhatsApp +20 112 309 4983.",
        ],
      },
    ],
  },
};

export default async function TermsPage() {
  const locale = await getLocale();
  const t = content[locale];
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-xl px-lg py-2xl">
      <div className="flex flex-col gap-sm">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.updated}</p>
        <p className="leading-relaxed text-ink-secondary">{t.intro}</p>
      </div>

      <nav
        aria-label={t.toc}
        className="flex flex-col gap-sm rounded-2xl border border-border bg-surface-soft p-lg"
      >
        <p className="text-sm font-semibold">{t.toc}</p>
        <ol className="grid gap-x-lg gap-y-1 text-sm sm:grid-cols-2">
          {t.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-turquoise-dark hover:underline">
                {s.h}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {t.sections.map((section) => (
        <section key={section.id} id={section.id} className="flex scroll-mt-24 flex-col gap-sm">
          <h2 className="font-display text-xl font-semibold">{section.h}</h2>
          <ul className="flex list-disc flex-col gap-xs ps-lg marker:text-turquoise">
            {section.p.map((p) => (
              <li key={p} className="leading-relaxed text-ink-secondary">
                {p}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="border-t border-border pt-lg text-sm text-ink-secondary">
        <Link href="/privacy" className="font-medium text-turquoise-dark hover:underline">
          {locale === "ar" ? "سياسة الخصوصية" : "Privacy policy"}
        </Link>
      </p>
    </main>
  );
}
