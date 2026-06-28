import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Historico() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/certificados?tab=historico", { replace: true });
  }, [navigate]);

  return null;
}
