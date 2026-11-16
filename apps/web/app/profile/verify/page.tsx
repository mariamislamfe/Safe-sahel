import { redirect } from "next/navigation";

/** Verification moved into the owner dashboard (ID + proof of ownership). */
export default function VerifyPage() {
  redirect("/owner/verification");
}
