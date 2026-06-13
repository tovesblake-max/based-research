"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Loader2, AlertCircle, Building2 } from "lucide-react";

const institutionTypes = [
  { value: "university", label: "University / Academic" },
  { value: "research_lab", label: "Research Laboratory" },
  { value: "hospital", label: "Hospital / Medical Center" },
  { value: "biotech", label: "Biotech Company" },
  { value: "distributor", label: "Distributor / Reseller" },
  { value: "other", label: "Other" },
];

export default function WholesaleApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "", website: "", ein: "",
    institutionType: "", estimatedMonthlyVolume: "", useCase: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit"); setLoading(false); return; }
      router.push("/wholesale/dashboard");
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">Wholesale Application</h1>
          <p className="text-muted text-sm">Applications reviewed within 24 hours.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div>
          <label htmlFor="ws-company" className="block text-sm font-medium text-foreground mb-1.5">Company Name <span className="text-destructive">*</span></label>
          <input id="ws-company" name="companyName" required value={form.companyName} onChange={handleChange} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ws-website" className="block text-sm font-medium text-foreground mb-1.5">Website</label>
            <input id="ws-website" name="website" value={form.website} onChange={handleChange} placeholder="https://" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ws-ein" className="block text-sm font-medium text-foreground mb-1.5">EIN / Tax ID</label>
            <input id="ws-ein" name="ein" value={form.ein} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="ws-type" className="block text-sm font-medium text-foreground mb-1.5">Institution Type <span className="text-destructive">*</span></label>
          <select id="ws-type" name="institutionType" required value={form.institutionType} onChange={handleChange}
            className={`${inputClass} ${form.institutionType ? "text-foreground" : "text-muted"}`}>
            <option value="" disabled>Select type</option>
            {institutionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="ws-volume" className="block text-sm font-medium text-foreground mb-1.5">Estimated Monthly Order Volume</label>
          <select id="ws-volume" name="estimatedMonthlyVolume" value={form.estimatedMonthlyVolume} onChange={handleChange} className={inputClass}>
            <option value="">Select range</option>
            <option value="<500">Under $500</option>
            <option value="500-1500">$500 – $1,500</option>
            <option value="1500-5000">$1,500 – $5,000</option>
            <option value="5000-10000">$5,000 – $10,000</option>
            <option value="10000+">$10,000+</option>
          </select>
        </div>

        <div>
          <label htmlFor="ws-usecase" className="block text-sm font-medium text-foreground mb-1.5">Primary Use Case / Research Area</label>
          <textarea id="ws-usecase" name="useCase" value={form.useCase} onChange={handleChange} rows={3} placeholder="Describe your research focus and how you plan to use our products..." className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none" />
        </div>

        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>
      </form>
    </div>
  );
}
