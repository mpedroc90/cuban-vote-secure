import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getToken, getUser, getUserType, submitVote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
}

const Voting = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [presidentId, setPresidentId] = useState<string>("");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [ethicsAccepted, setEthicsAccepted] = useState<boolean | null>(null);
  const [step, setStep] = useState<"vote" | "ethics" | "confirm">("vote");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!getToken() || getUserType() !== "member") {
      navigate("/");
      return;
    }
    const user = getUser();
    if (user?.has_voted) {
      navigate("/ya-voto");
      return;
    }
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    const { data } = await supabase.from("candidates").select("id, name, photo_url").order("name");
    setCandidates(data || []);
    setLoading(false);
  };

  const toggleMember = (id: string) => {
    const next = new Set(memberIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      // President is auto-member, so non-president members max 10
      if (next.size >= 10) {
        toast({ title: "Límite alcanzado", description: "Puede seleccionar hasta 10 miembros adicionales", variant: "destructive" });
        return;
      }
      next.add(id);
    }
    setMemberIds(next);
  };

  const totalSelected = (presidentId ? 1 : 0) + memberIds.size;
  const memberIdsWithoutPresident = Array.from(memberIds).filter(id => id !== presidentId);

  const handleVoteSubmit = () => {
    if (!presidentId) {
      toast({ title: "Requerido", description: "Debe seleccionar un presidente", variant: "destructive" });
      return;
    }
    setStep("ethics");
  };

  const handleEthicsSubmit = () => {
    if (ethicsAccepted === null) {
      toast({ title: "Requerido", description: "Debe responder la pregunta del Código de Ética", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await submitVote(presidentId, memberIdsWithoutPresident, ethicsAccepted!);
      navigate("/confirmacion");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>;
  }

  if (step === "ethics") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Código de Ética</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">¿Acepta usted el Código de Ética de la Sociedad Cubana de Psicología?</p>
            <RadioGroup
              value={ethicsAccepted === null ? undefined : ethicsAccepted ? "si" : "no"}
              onValueChange={(v) => setEthicsAccepted(v === "si")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="ethics-si" />
                <Label htmlFor="ethics-si">Sí, acepto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="ethics-no" />
                <Label htmlFor="ethics-no">No acepto</Label>
              </div>
            </RadioGroup>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("vote")}>Atrás</Button>
              <Button onClick={handleEthicsSubmit}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirm") {
    const president = candidates.find(c => c.id === presidentId);
    const selectedMembers = candidates.filter(c => memberIds.has(c.id) || c.id === presidentId);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Confirmar Voto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Presidente:</h3>
              <p>{president?.name}</p>
            </div>
            <div>
              <h3 className="font-semibold">Miembros ({selectedMembers.length}):</h3>
              <ul className="list-disc pl-5">
                {selectedMembers.map(c => <li key={c.id}>{c.name}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Código de Ética:</h3>
              <p>{ethicsAccepted ? "Aceptado" : "No aceptado"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("ethics")}>Atrás</Button>
              <Button onClick={handleFinalSubmit} disabled={submitting}>
                {submitting ? "Enviando..." : "Confirmar y Enviar Voto"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Votación</h1>
            <p className="text-sm text-muted-foreground">
              Presidente: {presidentId ? "1 ✓" : "0"}/1 · Miembros adicionales: {memberIds.size}/10 · Total: {totalSelected}/11
            </p>
          </div>
          <Button onClick={() => navigate("/propuestas")} variant="outline">Ver Propuestas</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Candidato</th>
                <th className="p-3 text-center w-28">Presidente</th>
                <th className="p-3 text-center w-28">Miembro</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const isPresident = presidentId === c.id;
                const isMember = memberIds.has(c.id) || isPresident;
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="radio"
                        name="president"
                        checked={isPresident}
                        onChange={() => {
                          setPresidentId(c.id);
                          // Auto-add as member if not already
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={isMember}
                        disabled={isPresident}
                        onCheckedChange={() => toggleMember(c.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleVoteSubmit} size="lg">
            Continuar al Código de Ética
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Voting;
