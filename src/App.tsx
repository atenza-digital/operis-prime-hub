import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ComercialLayout from "@/components/ComercialLayout";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Operacional */}
          <Route element={<AppLayout><Dashboard /></AppLayout>} path="/" />
          <Route element={<AppLayout><Agendamento /></AppLayout>} path="/agendar" />
          <Route element={<AppLayout><OSGerar /></AppLayout>} path="/os-gerar" />
          <Route element={<AppLayout><OrdensServico /></AppLayout>} path="/ordens" />
          <Route element={<AppLayout><OrdensServico /></AppLayout>} path="/os-finalizar" />
          <Route element={<AppLayout><Historico /></AppLayout>} path="/historico" />
          <Route element={<AppLayout><Medicao /></AppLayout>} path="/medicao" />
          <Route element={<AppLayout><Certificados /></AppLayout>} path="/certificados" />
          <Route element={<AppLayout><Equipes /></AppLayout>} path="/equipes" />
          <Route element={<AppLayout><Visualizador /></AppLayout>} path="/visualizar" />
          <Route path="/validar-certificado" element={<ValidarCertificado />} />
          <Route path="/validar-certificado/:hash" element={<ValidarCertificado />} />

          {/* Comercial */}
          <Route element={<ComercialLayout><Clientes /></ComercialLayout>} path="/comercial/clientes" />
          <Route element={<ComercialLayout><Servicos /></ComercialLayout>} path="/comercial/servicos" />
          <Route element={<ComercialLayout><Contratos /></ComercialLayout>} path="/comercial/contratos" />
          <Route element={<ComercialLayout><Configuracoes /></ComercialLayout>} path="/comercial/configuracoes" />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
