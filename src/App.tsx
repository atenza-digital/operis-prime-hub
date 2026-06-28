import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ComercialLayout from "@/components/ComercialLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Agendamento from "@/pages/Agendamento";
import OSGerar from "@/pages/OSGerar";
import OrdensServico from "@/pages/OrdensServico";
import Historico from "@/pages/Historico";
import Medicao from "@/pages/Medicao";
import Equipes from "@/pages/Equipes";
import Visualizador from "@/pages/Visualizador";
import Certificados from "@/pages/Certificados";
import ValidarCertificado from "@/pages/ValidarCertificado";
import Clientes from "@/pages/comercial/Clientes";
import Servicos from "@/pages/comercial/Servicos";
import Contratos from "@/pages/comercial/Contratos";
import Configuracoes from "@/pages/comercial/Configuracoes";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/validar-certificado" element={<ValidarCertificado />} />
            <Route path="/validar-certificado/:hash" element={<ValidarCertificado />} />

            {/* Operacional */}
            <Route element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} path="/" />
            <Route element={<ProtectedRoute><AppLayout><Agendamento /></AppLayout></ProtectedRoute>} path="/agendar" />
            <Route element={<ProtectedRoute><AppLayout><OSGerar /></AppLayout></ProtectedRoute>} path="/os-gerar" />
            <Route element={<ProtectedRoute><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/ordens" />
            <Route element={<ProtectedRoute><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/os-finalizar" />
            <Route element={<ProtectedRoute><AppLayout><Historico /></AppLayout></ProtectedRoute>} path="/historico" />
            <Route element={<ProtectedRoute><AppLayout><Medicao /></AppLayout></ProtectedRoute>} path="/medicao" />
            <Route element={<ProtectedRoute><AppLayout><Certificados /></AppLayout></ProtectedRoute>} path="/certificados" />
            <Route element={<ProtectedRoute><AppLayout><Equipes /></AppLayout></ProtectedRoute>} path="/equipes" />
            <Route element={<ProtectedRoute><AppLayout><Visualizador /></AppLayout></ProtectedRoute>} path="/visualizar" />

            {/* Comercial */}
            <Route element={<ProtectedRoute><ComercialLayout><Clientes /></ComercialLayout></ProtectedRoute>} path="/comercial/clientes" />
            <Route element={<ProtectedRoute><ComercialLayout><Servicos /></ComercialLayout></ProtectedRoute>} path="/comercial/servicos" />
            <Route element={<ProtectedRoute><ComercialLayout><Contratos /></ComercialLayout></ProtectedRoute>} path="/comercial/contratos" />
            <Route element={<ProtectedRoute><ComercialLayout><Configuracoes /></ComercialLayout></ProtectedRoute>} path="/comercial/configuracoes" />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
