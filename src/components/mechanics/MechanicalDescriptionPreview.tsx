import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { type MechanicalBehavior } from "../../domain/mechanicalBehavior";
import {
  describeMechanicalBehavior,
  type MechanicalDescriptionContext,
  type MechanicalDescriptionResult,
} from "../../domain/mechanicalDescription";
import { Badge } from "../ui/badge";

export interface MechanicalDescriptionPreviewProps {
  behaviors: MechanicalBehavior[];
  context?: MechanicalDescriptionContext;
  className?: string;
  showTitle?: boolean;
}

export function MechanicalDescriptionPreview({
  behaviors,
  context,
  className = "",
  showTitle = true,
}: MechanicalDescriptionPreviewProps) {
  const [expandedWarnings, setExpandedWarnings] = useState<Record<number, boolean>>({});

  const toggleWarning = (index: number) => {
    setExpandedWarnings((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const results: Array<{
    behavior: MechanicalBehavior;
    result: MechanicalDescriptionResult;
    index: number;
  }> = (behaviors || []).map((b, index) => ({
    behavior: b,
    result: describeMechanicalBehavior(b, { format: "compact", context }),
    index,
  }));

  const hasBehaviors = results.length > 0;

  return (
    <div
      data-testid="mechanical-description-section"
      className={`rounded-lg border border-border/70 bg-card/40 p-3.5 space-y-2.5 ${className}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Descripción mecánica
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            Auto-generada
          </Badge>
        </div>
      )}

      {!hasBehaviors ? (
        <p
          data-testid="mechanical-description-empty"
          className="text-xs text-muted-foreground italic"
        >
          Sin mecánica configurada.
        </p>
      ) : (
        <div
          data-testid="mechanical-description-content"
          className="space-y-2"
        >
          {results.map(({ result, index }) => (
            <div key={index} className="space-y-1">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                {results.length > 1 && (
                  <span className="text-primary font-bold select-none">•</span>
                )}
                <span className="flex-1 font-medium">{result.text}</span>
              </div>

              {!result.complete && (
                <div
                  data-testid="mechanical-description-warning"
                  className="ml-3.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
                      <span>⚠ La descripción automática está incompleta.</span>
                    </div>
                    {result.warnings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleWarning(index)}
                        className="text-[10px] underline hover:text-amber-200 flex items-center gap-0.5"
                      >
                        {expandedWarnings[index] ? (
                          <>
                            Ocultar detalles <ChevronDown className="size-3" />
                          </>
                        ) : (
                          <>
                            Ver detalles ({result.warnings.length}){" "}
                            <ChevronRight className="size-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {expandedWarnings[index] && result.warnings.length > 0 && (
                    <ul className="text-[11px] list-disc list-inside text-amber-300/90 pl-1 space-y-0.5 pt-1 border-t border-amber-500/20">
                      {result.warnings.map((warn, wIdx) => (
                        <li key={wIdx}>{warn}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
