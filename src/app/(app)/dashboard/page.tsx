"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStoredUser } from "@/lib/auth-storage";

const quickLinks = [
  {
    href: "/catalog",
    code: "CS",
    title: "Classes & Subjects",
    description: "Add, edit, or remove registration dropdown lists.",
  },
  {
    href: "/tutors",
    code: "TA",
    title: "Tutor approvals",
    description: "Review pending tutors and approve or reject them.",
  },
  {
    href: "/students",
    code: "SP",
    title: "Students & parents",
    description: "Create student and parent accounts with temporary passwords.",
  },
  {
    href: "/batches",
    code: "OB",
    title: "Offline batches",
    description: "Group students under a class and assign an offline tutor.",
  },
  {
    href: "/sessions",
    code: "SS",
    title: "Schedule sessions",
    description: "Book online or offline sessions and assign teachers.",
  },
];

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(getStoredUser()?.fullName ?? null);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome${name ? `, ${name}` : ""}. Catalog, students, batches, and session scheduling.`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="group block">
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-sm font-semibold text-primary">
                {link.code}
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">
                {link.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {link.description}
              </p>
              <p className="mt-5 text-sm font-semibold text-primary group-hover:underline">
                Open
              </p>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
