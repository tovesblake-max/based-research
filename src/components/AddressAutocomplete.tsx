"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

/**
 * Address line 1 with Google Places suggestions. As the customer types,
 * a debounced /api/places/autocomplete call returns up to ~5 matched
 * US addresses; selecting one auto-fills city/state/zip on the parent
 * form via the `onSelect` callback.
 *
 * Three modes the component handles transparently:
 *
 *   1. Backend configured (env var set) — full autocomplete UX.
 *   2. Backend NOT configured (env unset, /api/places returns 503)
 *      — falls back to a plain input, no error messaging. The
 *      customer just doesn't see suggestions.
 *   3. Network failure — same fallback as (2). Errors are logged
 *      to the console for debugging but never block the form.
 *
 * Session tokens: a UUID is minted per address-entry session and
 * passed through both autocomplete + details calls so Google bills
 * the interaction as one session (cheaper than per-keystroke billing).
 *
 * Design notes:
 *   - `address1` is the only input rendered here; the parent form
 *     keeps `city/state/zip/country` inputs for manual override
 *     (which we still want — users sometimes hand-correct what
 *     Google returns).
 *   - Click-outside closes the suggestion list (handled via blur).
 *   - Keyboard navigation: ArrowUp/Down to highlight, Enter to pick,
 *     Esc to close.
 */

interface Suggestion {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
}

interface ResolvedAddress {
  address1: string;
  city: string;
  state: string;     // 2-letter
  zip: string;
  country: string;   // ISO-2
  formatted: string;
}

interface Props {
  /** Current address1 value (controlled). */
  value: string;
  /** Called on each keystroke + when a suggestion is picked. */
  onChange: (value: string) => void;
  /** Called when the customer picks a suggestion. Parent should
   *  populate city/state/zip on selection. */
  onSelect: (resolved: ResolvedAddress) => void;
  /** id + name for the underlying <input>. */
  id?: string;
  name?: string;
  placeholder?: string;
  /** Tailwind classes — passed through to the input. */
  className?: string;
  required?: boolean;
  autoComplete?: string;
}

const DEBOUNCE_MS = 250;

function generateSessionToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  id,
  name,
  placeholder,
  className,
  required,
  autoComplete = "address-line1",
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  // 503 from the backend = autocomplete intentionally disabled (env
  // not configured). Stop trying for the rest of the session so we
  // don't burn requests.
  const [disabled, setDisabled] = useState(false);

  const sessionTokenRef = useRef<string>(generateSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced fetch.
  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: value,
            sessionToken: sessionTokenRef.current,
          }),
        });
        if (res.status === 503) {
          // Backend not configured — give up gracefully for the rest
          // of this component's lifetime.
          setDisabled(true);
          setSuggestions([]);
          return;
        }
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions || []);
        setHighlightIdx(0);
      } catch {
        // Network error — fail silently. The customer can still type
        // the address by hand.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, disabled]);

  const pickSuggestion = async (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    try {
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: s.placeId,
          sessionToken: sessionTokenRef.current,
        }),
      });
      if (!res.ok) {
        // Couldn't resolve — fall back to using the suggestion's
        // human-readable text as the address line. Customer can
        // still hand-fill city/state/zip.
        onChange(s.mainText || s.label);
        return;
      }
      const resolved = (await res.json()) as ResolvedAddress;
      onChange(resolved.address1 || s.mainText || s.label);
      onSelect(resolved);
      // Mint a fresh session token after a successful selection — the
      // current Google session is closed by the details call.
      sessionTokenRef.current = generateSessionToken();
    } catch {
      onChange(s.mainText || s.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      // Don't submit the form on Enter when picking a suggestion.
      e.preventDefault();
      const picked = suggestions[highlightIdx];
      if (picked) pickSuggestion(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay close so a click on a suggestion lands before the list
        // unmounts. 200ms is enough for any modern browser.
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={className}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={id ? `${id}-listbox` : undefined}
      />
      {/* Loading spinner — small, non-intrusive, only shows while
          a request is in flight. Lives inside the input gutter. */}
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        </span>
      )}

      {/* Suggestion dropdown */}
      {open && suggestions.length > 0 && !disabled && (
        <ul
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {suggestions.map((s, idx) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={idx === highlightIdx}
              onMouseDown={(e) => {
                // mousedown fires before blur, so the click registers.
                e.preventDefault();
                pickSuggestion(s);
              }}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`px-3 py-2 cursor-pointer flex items-start gap-2 text-sm ${
                idx === highlightIdx ? "bg-accent" : "hover:bg-accent/60"
              }`}
            >
              <MapPin
                className="w-4 h-4 text-muted flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate">{s.mainText || s.label}</p>
                {s.secondaryText && (
                  <p className="text-xs text-muted truncate">{s.secondaryText}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
