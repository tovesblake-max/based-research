import { FlaskConical, Shield, Microscope, Bug, Atom, CheckCircle } from "lucide-react";

export default function TrustBadges() {
  const tests = [
    { icon: <FlaskConical className="w-5 h-5" aria-hidden="true" />, name: "HPLC", sub: "Testing" },
    { icon: <Bug className="w-5 h-5" aria-hidden="true" />, name: "Endotoxin", sub: "Assay" },
    { icon: <Microscope className="w-5 h-5" aria-hidden="true" />, name: "TYMC", sub: "Test" },
    { icon: <Atom className="w-5 h-5" aria-hidden="true" />, name: "TAMC", sub: "Test" },
    { icon: <Shield className="w-5 h-5" aria-hidden="true" />, name: "Heavy Metal", sub: "Screening" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Left: Label */}
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          New
        </span>
        <h3 className="font-serif text-lg md:text-xl text-foreground">Advanced Laboratory Testing</h3>
      </div>

      {/* Right: Test badges */}
      <div className="flex flex-wrap items-center gap-3">
        {tests.map((test) => (
          <div
            key={test.name}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2"
          >
            <div className="text-primary">{test.icon}</div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">{test.name}</p>
              <p className="text-[10px] text-muted">{test.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
