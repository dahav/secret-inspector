"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [idPrefix, setIdPrefix] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, idPrefix }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      const project = await res.json();
      router.push(`/projects/${project.id}/config`);
    } catch {
      alert("Fehler beim Erstellen des Projekts");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Neues Projekt</CardTitle>
          <CardDescription>
            Erstellen Sie ein neues Secrets-Audit-Projekt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Projektname</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. GovForms2 - Secrets Audit"
                required
              />
            </div>
            <div>
              <Label htmlFor="prefix">ID-Prefix</Label>
              <Input
                id="prefix"
                value={idPrefix}
                onChange={(e) => setIdPrefix(e.target.value.toUpperCase())}
                placeholder="z.B. GF2"
                required
                pattern="[A-Z0-9]+"
                title="Nur Großbuchstaben und Zahlen"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Wird für stabile Finding-IDs verwendet (z.B. {idPrefix || "GF2"}
                -001)
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Erstelle..." : "Projekt erstellen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
