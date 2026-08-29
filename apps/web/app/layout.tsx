import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Tajawal } from "next/font/google";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MessengerWidget } from "@/components/messenger-widget";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const arabic = Tajawal({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Safe Sahel",
  description: "Find your next stay in Sahel.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${arabic.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <SiteHeader locale={locale} />
        <div className="flex-1 pt-16">{children}</div>
        <SiteFooter locale={locale} />
        <MessengerWidget locale={locale} />
      </body>
    </html>
  );
}
