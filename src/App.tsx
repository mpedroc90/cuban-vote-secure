import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MemberLogin from "./pages/MemberLogin";
import AdminLogin from "./pages/AdminLogin";
import Proposals from "./pages/Proposals";
import Voting from "./pages/Voting";
import VoteConfirmation from "./pages/VoteConfirmation";
import AlreadyVoted from "./pages/AlreadyVoted";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MemberLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/propuestas" element={<Proposals />} />
          <Route path="/votar" element={<Voting />} />
          <Route path="/confirmacion" element={<VoteConfirmation />} />
          <Route path="/ya-voto" element={<AlreadyVoted />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
