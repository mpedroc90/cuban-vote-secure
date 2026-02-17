import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { memberLogin } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const MemberLogin = () => {
  const [memberNumber, setMemberNumber] = useState("");
  const [idCard, setIdCard] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNumber.trim() || !idCard.trim()) {
      toast({ title: "Error", description: "Todos los campos son obligatorios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await memberLogin(memberNumber.trim(), idCard.trim());
      if (data.user.has_voted) {
        navigate("/ya-voto");
      } else {
        navigate("/propuestas");
      }
    } catch (err: any) {
      console.log(err)
      toast({ title: "Error de acceso", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sociedad Cubana de Psicología</CardTitle>
          <CardDescription>Sistema de Votación Electrónica</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberNumber">Número de Miembro</Label>
              <Input
                id="memberNumber"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                placeholder="Ingrese su número de miembro"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idCard">Carné de Identidad</Label>
              <Input
                id="idCard"
                type="password"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                placeholder="Ingrese su carné de identidad"
                maxLength={20}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verificando..." : "Iniciar Sesión"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/admin-login" className="text-sm text-muted-foreground hover:underline">
              Acceso Comisión Electoral
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberLogin;
