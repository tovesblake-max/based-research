/**
 * Builds a personalized, educational SMS body for an abandoned cart.
 *
 * Style rules:
 *   No em-dashes anywhere. Use periods, commas, colons.
 *   Sound like a person texting another person. Not marketing copy.
 *   Sign off in the brand voice so the customer feels a human wrote it.
 *   Aim for under 320 characters (2 SMS segments).
 *   No links by default. They just left the site. URLs feel transactional.
 */

export interface FollowupCartItem {
  productName: string;
  variantSize: string;
  slug: string;
  quantity: number;
  lineTotalCents: number;
}

export interface FollowupContext {
  firstName: string | null;
  totalCents: number;
  items: FollowupCartItem[];
}

/**
 * Educational sentence keyed by product slug. Each entry should sound like
 * something a real person would actually text to a friend, not something pulled
 * from a brochure. Specifics over generics. No "we" marketing language
 * inside the angle itself, that gets covered by the wrapper offer at the
 * end of the body.
 */
const ANGLE_BY_SLUG: Record<string, string> = {
  "ghk-cu":
    "Real quick on GHK-Cu since most vendors mess this up. The actual molecule is a deep blue-violet color from the copper coordination. If yours ever comes pale or white, the copper is gone and the assays won't reproduce.",
  tesamorelin:
    "Heads up on tesamorelin. It's 44 amino acids long, which means it degrades silently if it ships ambient in summer heat. Lots that pass a basic HPLC can still be inactive if cold chain broke at any point.",
  "bpc-157":
    "On BPC-157, the reproducibility gap is usually about HPLC shoulder peaks. Real lots show one clean peak. A lot of vendor material has a shoulder that nobody flags on the COA.",
  "tb-500":
    "Note on TB-500. The active fragment oxidizes if you reconstitute with anything other than bacteriostatic water. Most lot variability traces back to that one step.",
  "bpc-157-tb-500-blend":
    "On the BPC plus TB blend, blended peptides shift HPLC retention so it's hard to tell if both are intact. Worth asking any vendor for the components separately.",
  "cjc-1295-ipamorelin-blend":
    "On the CJC plus Ipa blend, most vendors don't separately quantify each component. Lot to lot drift on the ratio is where you see assay variability.",
  "cjc-1295-no-dac":
    "On CJC-1295 without DAC, the half life is short by design. If a vendor sample reads long acting, it's been contaminated with the DAC variant.",
  "cjc-1295-with-dac":
    "On CJC-1295 with DAC, the DAC modification is what gives it the week long half life. Lose that group during synthesis and you have plain CJC again.",
  ipamorelin:
    "On ipamorelin, the molecule is sensitive to oxidation at the Aib residue. The full length intact peptide is what binds the receptor.",
  sermorelin:
    "On sermorelin, the C-terminal amide is easy to lose during synthesis workup. Worth verifying on every lot.",
  semaglutide:
    "Heads up on GLP-1 work. Backbone hydrolysis at the Aib position is the silent failure mode on these molecules. Most vendor COAs don't check for it.",
  tirzepatide:
    "On GIP plus GLP-1 dual agonists, lot to lot consistency is the whole game. Mass spec confirmation should be batch linked, not template.",
  "glp3-rta":
    "On the triple agonist work, purity floor matters. 95 percent leaves room for inactive truncation products that pass cursory HPLC.",
  "ss-31-elamipretide":
    "On SS-31, the d-Arg residue is the key. Synthesis shortcuts replace it with regular L-Arg, which breaks the mitochondrial targeting. Worth confirming chirality on every lot.",
  "5-amino-1mq":
    "On 5-amino-1MQ, the methyl quinolinium core is light sensitive. Vendors that ship in clear vials are skipping a step.",
  cagrilintide:
    "On the amylin analog work, the lipid sidechain is what gives it the long half life. Lots that lose the sidechain look identical on a basic HPLC.",
  "pt-141":
    "On PT-141, peptide hydrolysis at the Arg-Phe bond is the silent failure mode. Lots that sat too long in solution are usually where the inconsistent reports come from.",
  "ghk-cu-cream":
    "Quick FYI on copper peptide work. The color is the tell. Pale or off white means the copper coordination is gone.",
  "bacteriostatic-water":
    "Quick note on bacteriostatic water. The benzyl alcohol concentration is what keeps reconstituted peptide stable for 21 days. Cheap water shortcuts that and your peptide oxidizes in a week.",
};

const GENERIC_ANGLE =
  "One thing worth knowing. Every lot we ship has a batch linked COA you can verify against the actual HPLC chromatogram. Most vendors give you a template doc that isn't tied to the lot in your hand.";

/** Highest-dollar item with a registered angle wins. If nothing matches,
 *  fall back to the generic batch linked COA pitch. */
function pickAngle(items: FollowupCartItem[]): string {
  const sorted = [...items].sort((a, b) => b.lineTotalCents - a.lineTotalCents);
  for (const item of sorted) {
    const angle = ANGLE_BY_SLUG[item.slug];
    if (angle) return angle;
  }
  return GENERIC_ANGLE;
}

/** Short cart description for the message body. */
function describeCart(items: FollowupCartItem[]): string {
  if (items.length === 0) return "your order";
  if (items.length === 1) {
    const i = items[0];
    const qty = i.quantity > 1 ? `${i.quantity}x ` : "";
    return `your ${qty}${i.variantSize} ${i.productName}`;
  }
  // Two or more items: lead with the highest dollar item, summarize rest.
  const sorted = [...items].sort((a, b) => b.lineTotalCents - a.lineTotalCents);
  const lead = sorted[0];
  const others = sorted.length - 1;
  const qty = lead.quantity > 1 ? `${lead.quantity}x ` : "";
  return `your ${qty}${lead.variantSize} ${lead.productName} order${others > 0 ? ` (plus ${others} other item${others === 1 ? "" : "s"})` : ""}`;
}

/**
 * Build the SMS body. Returns plain text. Caller encodes it into the
 * `sms:` URL. The shape is: greeting, observation, educational angle,
 * direct offer to help. Tone is texting a colleague, not selling.
 */
export function buildFollowupMessage(ctx: FollowupContext): string {
  const greeting = ctx.firstName ? `Hey ${ctx.firstName}` : "Hey";
  const cartDesc = describeCart(ctx.items);
  const angle = pickAngle(ctx.items);

  return `${greeting}, this is the team at Based Research. Saw ${cartDesc} didn't go through. ${angle} Want me to push it through manually? Just hit reply.`;
}
