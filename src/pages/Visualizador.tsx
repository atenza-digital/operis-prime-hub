import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Visualizador() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const hash = params.get("hash");
    navigate(hash ? `/certificados?hash=${encodeURIComponent(hash)}` : "/certificados", { replace: true });
  }, [navigate, params]);

  return null;
}
