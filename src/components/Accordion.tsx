"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  question: string;
  answer: string;
}

export default function Accordion({ question, answer }: AccordionProps) {
  const [open, setOpen] = useState(false);
  const panelId = `accordion-panel-${question.replace(/\s+/g, "-").toLowerCase().slice(0, 30)}`;
  const buttonId = `accordion-btn-${question.replace(/\s+/g, "-").toLowerCase().slice(0, 30)}`;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        id={buttonId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors cursor-pointer"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-sm font-medium text-foreground pr-4">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted flex-shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
      >
        {open && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted leading-relaxed">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
