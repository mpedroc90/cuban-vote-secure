import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getToken, getUserType, logout } from "@/lib/api";

interface Candidate {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
}

const Proposals = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken() || getUserType() !== "member") {
      navigate("/");
      return;
    }
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    const { data } = await supabase.from("candidates").select("id, name, bio, photo_url").order("name");
    setCandidates(data || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold">Propuestas de Candidatos</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/votar")} variant="default">
              Ir a Votar
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Cargando candidatos...</p>
        ) : candidates.length === 0 ? (
          <p className="text-center text-muted-foreground">No hay candidatos registrados aún.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setSelected(c)}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={c.photo_url || undefined} alt={c.name} />
                    <AvatarFallback className="text-lg">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{c.bio || "Sin biografía disponible."}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <Avatar className="h-28 w-28 shrink-0">
                <AvatarImage src={selected.photo_url || undefined} alt={selected.name} />
                <AvatarFallback className="text-3xl">{selected.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-center">{selected.name}</h2>
              <p className="text-sm text-muted-foreground text-center whitespace-pre-line break-words">
                {selected.bio || "Sin biografía disponible."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Proposals;
