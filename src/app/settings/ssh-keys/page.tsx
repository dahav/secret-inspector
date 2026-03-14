"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";


export default function SshKeysPage() {
  const { data: keys, mutate } = useSWR("/api/settings/ssh-keys", fetcher);
  const [name, setName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [adding, setAdding] = useState(false);

  async function addKey() {
    if (!name || !privateKey) {
      toast.error("Name und Private Key sind erforderlich");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/settings/ssh-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, privateKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Fehler");
        return;
      }
      setName("");
      setPrivateKey("");
      mutate();
      toast.success("SSH-Key hinzugefügt");
    } finally {
      setAdding(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("SSH-Key wirklich löschen?")) return;
    await fetch(`/api/settings/ssh-keys/${id}`, { method: "DELETE" });
    mutate();
    toast.success("SSH-Key gelöscht");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">SSH-Key-Verwaltung</h1>

      {/* Existing Keys */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gespeicherte Keys</CardTitle>
          <CardDescription>
            SSH-Keys werden für Git-Operationen beim Klonen von Repositories
            verwendet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!keys || keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine SSH-Keys gespeichert
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map(
                (key: {
                  id: string;
                  name: string;
                  createdAt: string;
                  project?: { name: string };
                }) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between border rounded p-3"
                  >
                    <div>
                      <div className="font-medium">{key.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Erstellt:{" "}
                        {new Date(key.createdAt).toLocaleString("de-DE")}
                        {key.project && ` | Projekt: ${key.project.name}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => deleteKey(key.id)}
                    >
                      Löschen
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Key */}
      <Card>
        <CardHeader>
          <CardTitle>Neuen Key hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="keyName">Name / Bezeichnung</Label>
            <Input
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. GitHub Deploy Key"
            />
          </div>
          <div>
            <Label htmlFor="keyContent">Private Key</Label>
            <Textarea
              id="keyContent"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              className="font-mono text-xs"
              rows={8}
            />
          </div>
          <Button onClick={addKey} disabled={adding || !name || !privateKey}>
            {adding ? "Wird gespeichert..." : "Key speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
