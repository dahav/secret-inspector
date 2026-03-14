"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScanContext } from "@/components/scan-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { useState } from "react";

export default function ProjectConfigPage() {
  const { id } = useParams<{ id: string }>();
  const { scanning } = useScanContext();
  const router = useRouter();
  const { data: project, mutate: mutateProject } = useSWR(
    `/api/projects/${id}`,
    fetcher
  );
  const { data: repos, mutate: mutateRepos } = useSWR(
    `/api/projects/${id}/repos`,
    fetcher
  );
  const { data: groups, mutate: mutateGroups } = useSWR(
    `/api/projects/${id}/groups`,
    fetcher
  );

  const [name, setName] = useState("");
  const [idPrefix, setIdPrefix] = useState("");
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoBranch, setNewRepoBranch] = useState("");
  const [newRepoType, setNewRepoType] = useState<string>("source");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupRepos, setNewGroupRepos] = useState("");
  const [editingProject, setEditingProject] = useState(false);

  // Initialize form when project loads
  if (project && !editingProject && name === "" && idPrefix === "") {
    setName(project.name);
    setIdPrefix(project.idPrefix);
  }

  async function updateProject() {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, idPrefix }),
    });
    setEditingProject(false);
    mutateProject();
    toast.success("Projekt aktualisiert");
  }

  async function addRepo() {
    if (!newRepoUrl) return;
    const res = await fetch(`/api/projects/${id}/repos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: newRepoUrl,
        branch: newRepoBranch || undefined,
        type: newRepoType,
      }),
    });
    if (res.ok) {
      setNewRepoUrl("");
      setNewRepoBranch("");
      mutateRepos();
      toast.success("Repository hinzugefügt");
    } else {
      const err = await res.json();
      toast.error(err.error || "Fehler");
    }
  }

  async function deleteRepo(repoId: string) {
    await fetch(`/api/projects/${id}/repos/${repoId}`, { method: "DELETE" });
    mutateRepos();
    toast.success("Repository entfernt");
  }

  async function addGroup() {
    if (!newGroupName) return;
    await fetch(`/api/projects/${id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newGroupName,
        repoNames: newGroupRepos,
      }),
    });
    setNewGroupName("");
    setNewGroupRepos("");
    mutateGroups();
    toast.success("Gruppe hinzugefügt");
  }

  async function deleteGroup(groupId: string) {
    await fetch(`/api/projects/${id}/groups?groupId=${groupId}`, {
      method: "DELETE",
    });
    mutateGroups();
    toast.success("Gruppe entfernt");
  }

  async function deleteProject() {
    if (!confirm("Projekt wirklich löschen? Alle Daten gehen verloren.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (!project) return <div className="text-muted-foreground">Laden...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-4">
        <Link href={`/projects/${id}`} className="text-sm text-muted-foreground hover:text-foreground">&larr; Zurück zum Projekt</Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Konfiguration</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${id}`)}
        >
          Zurück
        </Button>
      </div>

      {/* Project Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Projekteinstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Projektname</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setEditingProject(true);
                }}
              />
            </div>
            <div>
              <Label>ID-Prefix</Label>
              <Input
                value={idPrefix}
                onChange={(e) => {
                  setIdPrefix(e.target.value.toUpperCase());
                  setEditingProject(true);
                }}
              />
            </div>
          </div>
          {editingProject && (
            <Button onClick={updateProject} disabled={scanning}>Speichern</Button>
          )}
        </CardContent>
      </Card>

      {/* Repos */}
      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            Source-Repos werden gescannt, Dist-Repos für Enrichment verwendet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {repos?.map(
            (repo: {
              id: string;
              name: string;
              url: string;
              branch: string | null;
              type: string;
            }) => (
              <div
                key={repo.id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{repo.name}</span>
                    <Badge
                      variant={
                        repo.type === "source" ? "default" : "secondary"
                      }
                    >
                      {repo.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {repo.url}
                    {repo.branch && ` (${repo.branch})`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => deleteRepo(repo.id)}
                  disabled={scanning}
                >
                  Entfernen
                </Button>
              </div>
            )
          )}

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Repository hinzufügen</h4>
            <div className="grid grid-cols-4 gap-2">
              <Input
                className="col-span-2"
                placeholder="git@github.com:org/repo.git"
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
              />
              <Input
                placeholder="Branch (optional)"
                value={newRepoBranch}
                onChange={(e) => setNewRepoBranch(e.target.value)}
              />
              <Select value={newRepoType} onValueChange={(v) => { if (v) setNewRepoType(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Source</SelectItem>
                  <SelectItem value="dist">Dist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addRepo} disabled={scanning || !newRepoUrl}>
              Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Gruppen</CardTitle>
          <CardDescription>
            Benannte Repo-Gruppen für gefilterte Exports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups?.map(
            (group: {
              id: string;
              name: string;
              repoNames: string;
            }) => (
              <div
                key={group.id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div>
                  <span className="font-medium">{group.name}</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {group.repoNames || "(keine Repos)"}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => deleteGroup(group.id)}
                  disabled={scanning}
                >
                  Entfernen
                </Button>
              </div>
            )
          )}

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Gruppe hinzufügen</h4>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Gruppenname"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                placeholder="Repos (kommagetrennt)"
                value={newGroupRepos}
                onChange={(e) => setNewGroupRepos(e.target.value)}
              />
            </div>
            <Button onClick={addGroup} disabled={scanning || !newGroupName}>
              Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Gefahrenzone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={deleteProject} disabled={scanning}>
            Projekt löschen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
