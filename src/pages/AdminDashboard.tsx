import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getToken, getUserType, logout, adminAction } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  president_votes: number;
  member_votes: number;
}

interface Member {
  id: string;
  member_number: string;
  name: string;
  fee_status: string;
  has_voted: boolean;
  ethics_accepted: boolean | null;
}

interface Stats {
  total: number;
  eligible: number;
  voted: number;
  config: { is_open: boolean; results_revealed: boolean };
}

const AdminDashboard = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCandidate, setNewCandidate] = useState({ name: "", bio: "", photo_url: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [csvText, setCsvText] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!getToken() || getUserType() !== "admin") {
      navigate("/admin-login");
      return;
    }
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [candidatesData, membersData, statsData] = await Promise.all([
        adminAction("get-candidates"),
        adminAction("get-members"),
        adminAction("get-stats"),
      ]);
      setCandidates(candidatesData || []);
      setMembers(membersData || []);
      setSelectedMembers(new Set());
      setStats(statsData);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleElection = async () => {
    try {
      await adminAction("toggle-election", { is_open: !stats?.config.is_open });
      toast({ title: "Éxito", description: stats?.config.is_open ? "Votación cerrada" : "Votación abierta" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleResults = async () => {
    try {
      const action = stats?.config.results_revealed ? "hide-results" : "reveal-results";
      await adminAction(action);
      toast({ title: "Éxito", description: stats?.config.results_revealed ? "Resultados ocultos" : "Resultados revelados" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      let photo_url = newCandidate.photo_url;

      if (photoFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
        const result = await adminAction("upload-photo", {
          file_base64: base64,
          file_name: photoFile.name,
          content_type: photoFile.type,
        });
        photo_url = result.url;
      }

      await adminAction("add-candidate", { name: newCandidate.name, bio: newCandidate.bio, photo_url });
      setNewCandidate({ name: "", bio: "", photo_url: "" });
      setPhotoFile(null);
      toast({ title: "Éxito", description: "Candidato agregado" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      await adminAction("delete-candidate", { id });
      toast({ title: "Éxito", description: "Candidato eliminado" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleImportCSV = async () => {
    if (!csvText.trim()) {
      toast({ title: "Error", description: "Pegue los datos CSV", variant: "destructive" });
      return;
    }
    try {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const members = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });
      const result = await adminAction("import-members", { members });
      toast({
        title: "Importación completada",
        description: `${result.imported} miembros importados. ${result.errors?.length || 0} errores.`,
      });
      setCsvText("");
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResetVotes = async () => {
    if (!confirm("¿Está seguro de reiniciar todos los votos? Esta acción no se puede deshacer.")) return;
    try {
      await adminAction("reset-votes");
      toast({ title: "Éxito", description: "Votos reiniciados" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleViewResults = async () => {
    try {
      const results = await adminAction("get-results");
      setCandidates(results);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin-login");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold">Panel de Administración</h1>
          <Button onClick={handleLogout} variant="outline">Cerrar Sesión</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total Miembros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats?.eligible || 0}</p>
              <p className="text-sm text-muted-foreground">Al Día</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats?.voted || 0}</p>
              <p className="text-sm text-muted-foreground">Han Votado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Badge variant={stats?.config.is_open ? "default" : "secondary"}>
                  {stats?.config.is_open ? "ABIERTA" : "CERRADA"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Votación</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <Switch checked={stats?.config.is_open || false} onCheckedChange={handleToggleElection} />
              <Label>{stats?.config.is_open ? "Cerrar Votación" : "Abrir Votación"}</Label>
            </div>
            <Button variant="outline" onClick={handleToggleResults} disabled={stats?.config.is_open}>
              {stats?.config.results_revealed ? "Ocultar Resultados" : "Revelar Resultados"}
            </Button>
            {stats?.config.results_revealed && (
              <Button variant="outline" onClick={handleViewResults}>
                Ver Resultados
              </Button>
            )}
            <Button variant="destructive" onClick={handleResetVotes}>
              Reiniciar Votos
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="candidates">
          <TabsList className="mb-4">
            <TabsTrigger value="candidates">Candidatos ({candidates.length})</TabsTrigger>
            <TabsTrigger value="members">Miembros ({members.length})</TabsTrigger>
            <TabsTrigger value="import">Importar Miembros</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates">
            {/* Add candidate form */}
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-lg">Agregar Candidato</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nombre</Label>
                    <Input value={newCandidate.name} onChange={e => setNewCandidate(p => ({ ...p, name: e.target.value }))} maxLength={100} />
                  </div>
                  <div className="space-y-1">
                    <Label>Foto</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setPhotoFile(file);
                        if (file) setNewCandidate(p => ({ ...p, photo_url: "" }));
                      }}
                    />
                    {!photoFile && (
                      <Input
                        value={newCandidate.photo_url}
                        onChange={e => setNewCandidate(p => ({ ...p, photo_url: e.target.value }))}
                        placeholder="O pegue URL de foto"
                        maxLength={500}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Biografía</Label>
                  <Textarea value={newCandidate.bio} onChange={e => setNewCandidate(p => ({ ...p, bio: e.target.value }))} rows={6} />
                </div>
                <Button onClick={handleAddCandidate} disabled={uploading}>
                  {uploading ? "Subiendo..." : "Agregar"}
                </Button>
              </CardContent>
            </Card>

            {/* Candidates list */}
            <div className="space-y-2">
              {candidates.map(c => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.bio?.slice(0, 80)}...</p>
                      {stats?.config.results_revealed && (
                        <p className="text-sm mt-1">
                          Presidente: <strong>{c.president_votes}</strong> · Miembro: <strong>{c.member_votes}</strong>
                        </p>
                      )}
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCandidate(c.id)}>Eliminar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="members">
            {selectedMembers.size > 0 && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{selectedMembers.size} seleccionado(s)</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar ${selectedMembers.size} miembro(s)? Esta acción no se puede deshacer.`)) return;
                    try {
                      await adminAction("delete-members", { member_ids: Array.from(selectedMembers) });
                      toast({ title: "Éxito", description: `${selectedMembers.size} miembro(s) eliminado(s)` });
                      loadData();
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    }
                  }}
                >
                  Eliminar Seleccionados
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedMembers(new Set())}>
                  Deseleccionar
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-center w-10">
                      <Checkbox
                        checked={members.length > 0 && selectedMembers.size === members.length}
                        onCheckedChange={(checked) => {
                          setSelectedMembers(checked ? new Set(members.map(m => m.id)) : new Set());
                        }}
                      />
                    </th>
                    <th className="p-2 text-left">Número</th>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-center">Estado</th>
                    <th className="p-2 text-center">Votó</th>
                    <th className="p-2 text-center">Ética</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b">
                      <td className="p-2 text-center">
                        <Checkbox
                          checked={selectedMembers.has(m.id)}
                          onCheckedChange={(checked) => {
                            setSelectedMembers(prev => {
                              const next = new Set(prev);
                              checked ? next.add(m.id) : next.delete(m.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="p-2">{m.member_number}</td>
                      <td className="p-2">{m.name}</td>
                      <td className="p-2 text-center">
                        <Badge variant={m.fee_status === "paid" ? "default" : "secondary"}>
                          {m.fee_status === "paid" ? "Al día" : "Pendiente"}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">{m.has_voted ? "✓" : "—"}</td>
                      <td className="p-2 text-center">
                        {m.ethics_accepted === null ? "—" : m.ethics_accepted ? "Sí" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Importar Miembros via CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pegue los datos CSV con las columnas: <code>numero_miembro, carnet, nombre, estado</code>
                  <br />
                  Estado acepta: pagado, al día, si, sí, yes, paid, 1, true
                </p>
                <Textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="numero_miembro,carnet,nombre,estado&#10;001,12345678901,Juan Pérez,pagado&#10;002,98765432101,María García,pendiente"
                  rows={10}
                />
                <Button onClick={handleImportCSV}>Importar</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
