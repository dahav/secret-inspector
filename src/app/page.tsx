import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    include: {
      repos: true,
      scans: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { findings: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Projektübersicht</p>
        </div>
        <Link href="/projects/new">
          <Button>Neues Projekt</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Noch keine Projekte vorhanden.{" "}
            <Link href="/projects/new" className="text-blue-600 underline">
              Erstes Projekt anlegen
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const lastScan = project.scans[0];
            const sourceRepos = project.repos.filter(
              (r) => r.type === "source"
            );
            const distRepos = project.repos.filter((r) => r.type === "dist");

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>
                      Prefix: {project.idPrefix}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Badge variant="outline">
                        {sourceRepos.length} Source-Repos
                      </Badge>
                      <Badge variant="outline">
                        {distRepos.length} Dist-Repos
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {project._count.findings} Findings
                      </span>
                      {lastScan && (
                        <Badge
                          variant={
                            lastScan.status === "completed"
                              ? "default"
                              : lastScan.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {lastScan.status === "completed"
                            ? "Gescannt"
                            : lastScan.status === "running"
                              ? "Läuft..."
                              : lastScan.status === "error"
                                ? "Fehler"
                                : "Ausstehend"}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
