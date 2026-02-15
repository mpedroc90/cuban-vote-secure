import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { logout } from "@/lib/api";
import { AlertCircle } from "lucide-react";

const AlreadyVoted = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Ya ha votado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Usted ya ha ejercido su derecho al voto en esta elección. Solo se permite un voto por miembro.</p>
          <Button onClick={handleLogout} className="w-full" variant="outline">Cerrar Sesión</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlreadyVoted;
