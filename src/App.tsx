import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Agendamento = lazy(() => import("@/pages/Agendamento"));
const OSGerar = lazy(() => import("@/pages/OSGerar"));
const OrdensServico = lazy(() => import("@/pages/OrdensServico"));
const Historico = lazy(() => import("@/pages/Historico"));
const Medicao = lazy(() => import("@/pages/Medicao"));
const AuditoriaAnexos = lazy(() => import("@/pages/AuditoriaAnexos"));
const RelatoriosTecnicos = lazy(() => import("@/pages/RelatoriosTecnicos"));
const Equipes = lazy(() => import("@/pages/Equipes"));
const Visualizador = lazy(() => import("@/pages/Visualizador"));
const Certificados = lazy(() => import("@/pages/Certificados"));
const ValidarCertificado = lazy(() => import("@/pages/ValidarCertificado"));
const Usuarios = lazy(() => import("@/pages/Usuarios"));
const AuditoriaEventos = lazy(() => import("@/pages/AuditoriaEventos"));
const AlterarSenha = lazy(() => import("@/pages/AlterarSenha"));
const Clientes = lazy(() => import("@/pages/comercial/Clientes"));
const Servicos = lazy(() => import("@/pages/comercial/Servicos"));
const Produtos = lazy(() => import("@/pages/comercial/Produtos"));
const Contratos = lazy(() => import("@/pages/comercial/Contratos"));
const Configuracoes = lazy(() => import("@/pages/comercial/Configuracoes"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
    <div className="rounded-2xl border bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-semibold text-emerald-700">Carregando módulo</p>
      <p className="mt-1 text-sm text-muted-foreground">Preparando a tela solicitada...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/alterar-senha" element={<AlterarSenha />} />
              <Route path="/validar-certificado" element={<ValidarCertificado />} />
              <Route path="/validar-certificado/:hash" element={<ValidarCertificado />} />

              <Route element={<ProtectedRoute permission="dashboard.view"><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} path="/" />
              <Route element={<ProtectedRoute permission="agenda.manage"><AppLayout><Agendamento /></AppLayout></ProtectedRoute>} path="/agendar" />
              <Route element={<ProtectedRoute permission="os.manage"><AppLayout><OSGerar /></AppLayout></ProtectedRoute>} path="/os-gerar" />
              <Route element={<ProtectedRoute permission="os.manage"><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/ordens" />
              <Route element={<ProtectedRoute permission="os.close"><AppLayout><OrdensServico /></AppLayout></ProtectedRoute>} path="/os-finalizar" />
              <Route element={<ProtectedRoute permission="certificados.manage"><AppLayout><Historico /></AppLayout></ProtectedRoute>} path="/historico" />
              <Route element={<ProtectedRoute permission="medicoes.manage"><AppLayout><Medicao /></AppLayout></ProtectedRoute>} path="/medicao" />
              <Route element={<ProtectedRoute permission="os.manage"><AppLayout><AuditoriaAnexos /></AppLayout></ProtectedRoute>} path="/auditoria-anexos" />
              <Route element={<ProtectedRoute permission="os.manage"><AppLayout><RelatoriosTecnicos /></AppLayout></ProtectedRoute>} path="/relatorios-tecnicos" />
              <Route element={<ProtectedRoute permission="certificados.manage"><AppLayout><Certificados /></AppLayout></ProtectedRoute>} path="/certificados" />
              <Route element={<ProtectedRoute permission="equipes.manage"><AppLayout><Equipes /></AppLayout></ProtectedRoute>} path="/equipes" />
              <Route element={<ProtectedRoute permission="dashboard.view"><AppLayout><Visualizador /></AppLayout></ProtectedRoute>} path="/visualizar" />
              <Route element={<ProtectedRoute permission="usuarios.manage"><AppLayout><Usuarios /></AppLayout></ProtectedRoute>} path="/usuarios" />
              <Route element={<ProtectedRoute permission="auditoria.view"><AppLayout><AuditoriaEventos /></AppLayout></ProtectedRoute>} path="/auditoria-eventos" />

              <Route element={<ProtectedRoute permission="clientes.manage"><AppLayout><Clientes /></AppLayout></ProtectedRoute>} path="/comercial/clientes" />
              <Route element={<ProtectedRoute permission="servicos.manage"><AppLayout><Servicos /></AppLayout></ProtectedRoute>} path="/comercial/servicos" />
              <Route element={<ProtectedRoute permission="servicos.manage"><AppLayout><Produtos /></AppLayout></ProtectedRoute>} path="/comercial/produtos" />
              <Route element={<ProtectedRoute permission="contratos.manage"><AppLayout><Contratos /></AppLayout></ProtectedRoute>} path="/comercial/contratos" />
              <Route element={<ProtectedRoute permission="configuracoes.manage"><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} path="/comercial/configuracoes" />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
