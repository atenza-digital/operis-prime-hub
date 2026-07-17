import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OSGerar() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/agendar", { replace: true });
  }, [navigate]);

  return null;
}
