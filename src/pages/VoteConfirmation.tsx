import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/api";
import { CheckCircle } from "lucide-react";

const VoteConfirmation = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">¡Voto Registrado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Su voto ha sido registrado exitosamente de forma anónima. Gracias por participar en el proceso electoral.</p>
          <Button onClick={handleLogout} className="w-full">Cerrar Sesión</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoteConfirmation;
