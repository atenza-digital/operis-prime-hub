import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OSFinalizar() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/ordens", { replace: true });
  }, [navigate]);

  return null;
}
