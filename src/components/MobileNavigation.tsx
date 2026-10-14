"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["/dashboard","Home"],["/students","Students"],["/sessions","Sessions"],["/exams","Exams"],["/finance","Finance"]];
export function MobileNavigation() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login" || pathname === "/forgot-password") return null;
  return <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgb(15_23_42_/_0.04)] backdrop-blur lg:hidden">
    {links.map(([href, label], index) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={"flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold " + (pathname === href ? "text-primary" : "text-text-secondary")}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d={["M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7", "M7 3h10v18H7zM10 7h4M10 11h4M10 15h4", "M4 5h16v16H4zM8 3v4m8-4v4M4 10h16M8 14h3m2 3h3", "M4 7h16v14H4zM8 7V3h8v4M8 12h8m-8 4h5", "M4 3h16v18H4zM8 7h8M8 11h8M8 15h5"][index]} /></svg>{label}
    </Link>)}
  </nav>;
}

