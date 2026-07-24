import { useEffect, useRef } from "react";

export default function BottomSheet({ abierto, onCerrar, titulo, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);

  // Reajusta altura cuando aparece el teclado virtual en iOS
  useEffect(() => {
    if (!abierto || !window.visualViewport) return;
    const ajustar = () => {
      if (panelRef.current) {
        const vh = window.visualViewport.height;
        panelRef.current.style.height = `${Math.min(vh * 0.92, vh - 20)}px`;
      }
    };
    ajustar();
    window.visualViewport.addEventListener("resize", ajustar);
    window.visualViewport.addEventListener("scroll", ajustar);
    return () => {
      window.visualViewport.removeEventListener("resize", ajustar);
      window.visualViewport.removeEventListener("scroll", ajustar);
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onCerrar}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1050, animation: "fadeIn 0.2s ease",
        }}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#fff", borderRadius: "16px 16px 0 0",
          zIndex: 1051, height: "85vh", overflowY: "auto",
          animation: "slideUp 0.25s ease",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Handle */}
        <div className="d-flex justify-content-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#ddd" }} />
        </div>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between px-4 pb-3">
          <h5 className="fw-bold mb-0">{titulo}</h5>
          <button className="btn-close" onClick={onCerrar} />
        </div>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}
