import { AccountShell } from "@/components/account-shell";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <AccountShell>{children}</AccountShell>;
}
