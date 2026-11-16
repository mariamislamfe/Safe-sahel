"use client";

import { whatsAppUrl } from "@safe-sahel/utils";
import { trackEvent } from "@/components/tracking";

export function WhatsAppButton({
  phone,
  message,
  label,
  propertyId,
  className,
}: {
  phone: string;
  message?: string;
  label: string;
  propertyId?: string;
  className?: string;
}) {
  return (
    <a
      href={whatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => propertyId && trackEvent("whatsapp_click", propertyId)}
      className={
        className ??
        "inline-flex items-center justify-center gap-sm rounded-full bg-[#25D366] px-xl py-md font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      }
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 001.8-1.3 2.3 2.3 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" />
      </svg>
      {label}
    </a>
  );
}
