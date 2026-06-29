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
import AuditoriaAnexos from "@/pages/AuditoriaAnexos";
import Equipes from "@/pages/Equipes";
import Visualizador from "@/pages/Visualizador";
import Certificados from "@/pages/Certificados";
import ValidarCertificado from "@/pages/ValidarCertificado";
import Usuarios from "@/pages/Usuarios";
import AlterarSenha from "@/pages/AlterarSenha";
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
            <Route path="/alterar-senha" element={<AlterarSenha />} />
            <Route path="/validar-certificado" element={<ValidarCertificado />} />
            <Route path="/validar-certificado/:hash" element={<ValidarCertificado />} />

            {/* Operacional */}
            <Route element={<ProtectedRoute permission="dashboard.view"><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} path="/" />
            <Route element={<ProtectedRoute permission="agenda.manage"><AppLayout><Agendamento /></AppLayout></ProtectedRoute>} path="/agendar" />
            <Route element={<ProtectedRoute permission="os.manage"><AppLayout><OSGerar /></AppLayout></ProtectedRoute>} path="/os-gerar" />
            <Route element={<ProtectedRoute permission="os.manage"><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/ordens" />
            <Route element={<ProtectedRoute permission="os.close"><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/os-finalizar" />
            <Route element={<ProtectedRoute permission="certificados.manage"><AppLayout><Historico /></AppLayout></ProtectedRoute>} path="/historico" />
            <Route element={<ProtectedRoute permission="medicoes.manage"><AppLayout><Medicao /></AppLayout></ProtectedRoute>} path="/medicao" />
            <Route element={<ProtectedRoute permission="os.manage"><AppLayout><AuditoriaAnexos /></AppLayout></ProtectedRoute>} path="/auditoria-anexos" />
            <Route element={<ProtectedRoute permission="certificados.manage"><AppLayout><Certificados /></AppLayout></ProtectedRoute>} path="/certificados" />
            <Route element={<ProtectedRoute permission="equipes.manage"><AppLayout><Equipes /></AppLayout></ProtectedRoute>} path="/equipes" />
            <Route element={<ProtectedRoute permission="dashboard.view"><AppLayout><Visualizador /></AppLayout></ProtectedRoute>} path="/visualizar" />
            <Route element={<ProtectedRoute permission="usuarios.manage"><AppLayout><Usuarios /></AppLayout></ProtectedRoute>} path="/usuarios" />

            {/* Comercial */}
            <Route element={<ProtectedRoute permission="clientes.manage"><ComercialLayout><Clientes /></ComercialLayout></ProtectedRoute>} path="/comercial/clientes" />
            <Route element={<ProtectedRoute permission="servicos.manage"><ComercialLayout><Servicos /></ComercialLayout></ProtectedRoute>} path="/comercial/servicos" />
            <Route element={<ProtectedRoute permission="contratos.manage"><ComercialLayout><Contratos /></ComercialLayout></ProtectedRoute>} path="/comercial/contratos" />
            <Route element={<ProtectedRoute permission="configuracoes.manage"><ComercialLayout><Configuracoes /></ComercialLayout></ProtectedRoute>} path="/comercial/configuracoes" />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
