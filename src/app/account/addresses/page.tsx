"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/Button";
import { Plus, MapPin, Save, X, CheckCircle, Loader2, AlertCircle, Trash2 } from "lucide-react";

interface Address {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

const emptyForm = {
  label: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      if (res.ok) {
        setAddresses(data.addresses);
      }
    } catch {
      // silently fail on fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          address2: form.address2 || undefined,
          label: form.label || undefined,
          country: "US",
          isDefault: addresses.length === 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save address");
      } else {
        setForm(emptyForm);
        setShowForm(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await fetchAddresses();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/addresses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">Addresses</h1>
          <p className="text-muted text-sm">Manage your shipping and billing addresses.</p>
        </div>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Address
          </Button>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-success font-medium mb-4 p-3 bg-success/10 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Address saved successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Address form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">New Address</h3>
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setError(""); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label="Cancel"
            >
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-foreground mb-1.5">
                Address Label <span className="text-muted text-xs font-normal">(e.g. Home, Lab, Office)</span>
              </label>
              <input
                id="label"
                name="label"
                type="text"
                value={form.label}
                onChange={handleChange}
                placeholder="Home"
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="addr-firstName" className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
                <input
                  id="addr-firstName"
                  name="firstName"
                  type="text"
                  required
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label htmlFor="addr-lastName" className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
                <input
                  id="addr-lastName"
                  name="lastName"
                  type="text"
                  required
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address1" className="block text-sm font-medium text-foreground mb-1.5">Address Line 1</label>
              <input
                id="address1"
                name="address1"
                type="text"
                required
                value={form.address1}
                onChange={handleChange}
                placeholder="123 Main St"
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label htmlFor="address2" className="block text-sm font-medium text-foreground mb-1.5">
                Address Line 2 <span className="text-muted text-xs font-normal">(optional)</span>
              </label>
              <input
                id="address2"
                name="address2"
                type="text"
                value={form.address2}
                onChange={handleChange}
                placeholder="Apt, Suite, Unit"
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1.5">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={form.city}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-foreground mb-1.5">State</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  required
                  value={form.state}
                  onChange={handleChange}
                  placeholder="CA"
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-foreground mb-1.5">ZIP Code</label>
                <input
                  id="zip"
                  name="zip"
                  type="text"
                  required
                  value={form.zip}
                  onChange={handleChange}
                  placeholder="90210"
                  className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" size="md" disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Address</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address list */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-card rounded-xl border border-border p-5 relative">
              {addr.isDefault && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Default
                </span>
              )}
              {addr.label && (
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{addr.label}</p>
              )}
              <p className="text-sm text-foreground font-medium">{addr.firstName} {addr.lastName}</p>
              <p className="text-sm text-muted mt-1">{addr.address1}</p>
              {addr.address2 && <p className="text-sm text-muted">{addr.address2}</p>}
              <p className="text-sm text-muted">{addr.city}, {addr.state} {addr.zip}</p>
              <div className="flex gap-3 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => removeAddress(addr.id)}
                  disabled={deleting === addr.id}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline cursor-pointer disabled:opacity-50"
                >
                  {deleting === addr.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-2">No addresses saved</h3>
            <p className="text-muted text-sm mb-6">
              Add a shipping address to speed up your checkout process.
            </p>
            <Button variant="primary" size="md" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Address
            </Button>
          </div>
        )
      )}
    </div>
  );
}
