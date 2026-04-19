import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let idCounter = 0;

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        background: "#0f172a",
        primaryColor: "#1e293b",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#334155",
        lineColor: "#64748b",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
        edgeLabelBackground: "#0f172a",
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
      },
      flowchart: { curve: "basis", padding: 20 },
    });

    const id = `mermaid-${++idCounter}`;

    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.width = "100%";
            svgEl.style.height = "auto";
            svgEl.style.maxHeight = "420px";
          }
        }
      })
      .catch((err) => {
        setError(String(err));
      });
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive font-mono">
        Failed to render diagram: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-x-auto" />;
}
