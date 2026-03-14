"use client";

import Link from "next/link";

export function BackLink({ href }: { href: string }) {
  return (
    <div className="mb-4">
      <Link
        href={href}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Zurück zum Projekt
      </Link>
    </div>
  );
}
