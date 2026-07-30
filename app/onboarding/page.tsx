"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnalysisResult,
  BrandMaturity,
  ExtractedFeatures,
  IncomeTarget,
  ProductProfile,
  ScoredCity
} from "@/lib/types";

// ─── Static option lists ───────────────────────────────────────────────────────

const CATEGORIES = [
  "FMCG",
  "Beverage",
  "Beauty & Personal Care",
  "Health & Wellness",
  "Food",
  "Consumer Electronics",
  "Other"
];

const SUBCATEGORIES: Record<string, string[]> = {
  FMCG: ["Snacks & Namkeen", "Staples & Grains", "Household Cleaning", "Personal Care"],
  Beverage: ["Energy Drink", "Juice & Smoothie", "Water & Hydration", "Tea & Coffee", "Alcohol & Spirits"],
  "Beauty & Personal Care": ["Skincare", "Haircare", "Makeup & Cosmetics", "Fragrances", "Men's Grooming"],
  "Health & Wellness": ["Protein & Supplements", "Ayurveda & Herbal", "Vitamins & Minerals", "Sports Nutrition"],
  Food: ["Fresh & Organic", "Packaged & Processed", "Frozen Foods", "Ready to Eat", "Baked Goods"],
  "Consumer Electronics": ["Wearables", "Audio", "Smart Home", "Mobile Accessories", "Appliances"],
  Other: ["Other"]
};

// Categories where cold chain and shelf life fields are relevant
const COLD_CHAIN_CATS = new Set(["Beverage", "Food", "Health & Wellness"]);
const SHELF_LIFE_CATS = new Set(["Beverage", "Food", "FMCG", "Health & Wellness"]);

const CAPACITY_OPTIONS = [
  "Under 1,000 units/month",
  "1,000 – 10,000 units/month",
  "10,000 – 1L units/month",
  "1L – 10L units/month",
  "Above 10L units/month"
];

const BUDGET_OPTIONS = [
  "Under ₹1L",
  "₹1L – ₹5L",
  "₹5L – ₹20L",
  "₹20L – ₹1Cr",
  "Above ₹1Cr"
];

const TARGET_CUSTOMERS = [
  "Gen Z (18–24)",
  "Millennials (25–35)",
  "Young Professionals (26–40)",
  "Families & Homemakers",
  "Health & Fitness Enthusiasts",
  "Mass Market (All demographics)"
];

const CURRENT_CHANNEL_OPTIONS = [
  "D2C website / app",
  "Amazon / Flipkart",
  "Offline retail",
  "None yet"
];

const CHANNEL_OPTIONS = [
  "D2C website / app",
  "Amazon / Flipkart",
  "Quick commerce (Blinkit, Zepto, Swiggy Instamart)",
  "Modern trade (BigBazaar, Reliance Fresh, DMart)",
  "Kirana / General trade",
  "HoReCa (Hotels, restaurants, cafes)",
  "Specialty retail (gyms, salons, pharmacies)",
  "B2B / Institutional"
];

const WAREHOUSE_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Surat",
  "Jaipur",
  "Lucknow",
  "Kochi"
];

const RADIUS_OPTIONS = [
  { value: 100, label: "Local Only (under 100 km)" },
  { value: 250, label: "Intra-state (under 250 km)" },
  { value: 500, label: "Regional (under 500 km)" },
  { value: 1000, label: "Multi-regional (under 1000 km)" },
  { value: 3000, label: "National Coverage (under 3000 km)" }
];

const LOADING_PHASES = [
  "READING PRODUCT PROFILE",
  "CALIBRATING WEIGHTS",
  "SCORING 50+ MARKETS",
  "WRITING STRATEGY"
];

const STEP_LABELS = [
  "Product",
  "Business",
  "Market",
  "Channels",
  "Goals"
];

// ─── Initial form state ────────────────────────────────────────────────────────

const INITIAL: ProductProfile = {
  productName: "",
  category: "",
  subcategory: "",
  priceINR: 0,
  marginPercent: 30,
  packSize: "",
  shelfLifeDays: null,
  needsColdChain: false,
  brandName: "",
  brandMaturity: "new",
  currentChannels: [],
  currentCities: "",
  monthlyCapacityUnits: "",
  launchBudgetINR: "",
  warehouseCity: "",
  deliveryRadiusKM: 500,
  targetCustomer: "",
  incomeTarget: "mid",
  preferredRegion: "all",
  specificRegion: "",
  preferredChannels: [],
  hasDistributor: "no",
  primaryGoal: "revenue",
  launchTimeline: "1quarter",
  successMetric: "revenue",
  competitors: ""
};

// ─── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: ProductProfile): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (!data.productName.trim()) errors.push("Product name is required.");
    if (!data.category) errors.push("Category is required.");
    if (!data.subcategory) errors.push("Subcategory is required.");
    if (!data.priceINR || data.priceINR <= 0) errors.push("Enter a valid price greater than ₹0.");
    if (!data.marginPercent || data.marginPercent <= 0 || data.marginPercent >= 100)
      errors.push("Enter a valid net retail profit margin percentage (1% to 99%).");
    if (!data.packSize.trim()) errors.push("Pack size / unit type is required.");
  }
  if (step === 2) {
    if (!data.brandName.trim()) errors.push("Brand name is required.");
    if (!data.monthlyCapacityUnits) errors.push("Monthly production capacity is required.");
    if (!data.launchBudgetINR) errors.push("Launch budget range is required.");
    if (!data.warehouseCity) errors.push("Primary dispatch warehouse location is required.");
    if (!data.deliveryRadiusKM || data.deliveryRadiusKM <= 0)
      errors.push("Please select a maximum delivery distribution radius.");
  }
  if (step === 3) {
    if (!data.targetCustomer) errors.push("Target customer segment is required.");
    if (data.preferredRegion === "specific" && !data.specificRegion.trim())
      errors.push("Please specify the target region or states.");
  }
  if (step === 4) {
    if (data.preferredChannels.length === 0)
      errors.push("Select at least one preferred channel.");
  }
  return errors;
}

// ─── Reusable primitives ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
      {children}
    </p>
  );
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-1">{children}</div>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value === 0 && type === "number" ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#0f1a10] bg-[#0a1210] px-4 py-3 text-sm text-[#c8e8c0] outline-none placeholder:text-[#2e4d30] focus:border-[#00ff88]/40"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: (string | { value: number; label: string })[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[#0f1a10] bg-[#0a1210] px-4 py-3 text-sm text-[#c8e8c0] outline-none focus:border-[#00ff88]/40"
    >
      {placeholder && (
        <option value="" className="text-[#2e4d30]">
          {placeholder}
        </option>
      )}
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const lbl = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={val} value={val} className="bg-[#0a1210]">
            {lbl}
          </option>
        );
      })}
    </select>
  );
}

function RadioGroup<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; description?: string }[];
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-start gap-3 border px-4 py-3 text-left transition-colors ${
            value === opt.value
              ? "border-[#00ff88]/30 bg-[#00ff88]/5"
              : "border-[#0f1a10] bg-[#0a1210] hover:border-[#1a2e1a]"
          }`}
        >
          <span
            className={`mt-0.5 h-3 w-3 flex-shrink-0 rounded-full border ${
              value === opt.value
                ? "border-[#00ff88] bg-[#00ff88]"
                : "border-[#2e4d30]"
            }`}
          />
          <span>
            <span
              className={`block text-sm ${
                value === opt.value ? "text-[#c8e8c0]" : "text-[#7a9678]"
              }`}
            >
              {opt.label}
            </span>
            {opt.description && (
              <span className="mt-0.5 block text-[11px] text-[#2e4d30]">
                {opt.description}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup({
  selected,
  onChange,
  options,
  exclusive
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
  exclusive?: string; // if this value is selected, clear all others
}) {
  function toggle(opt: string) {
    if (exclusive && opt === exclusive) {
      onChange([exclusive]);
      return;
    }
    const without = selected.filter((s) => s !== exclusive);
    if (without.includes(opt)) {
      onChange(without.filter((s) => s !== opt));
    } else {
      onChange([...without, opt]);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
              checked
                ? "border-[#00ff88]/30 bg-[#00ff88]/5"
                : "border-[#0f1a10] bg-[#0a1210] hover:border-[#1a2e1a]"
            }`}
          >
            <span
              className={`h-3 w-3 flex-shrink-0 border ${
                checked ? "border-[#00ff88] bg-[#00ff88]" : "border-[#2e4d30]"
              }`}
            />
            <span
              className={`text-sm ${checked ? "text-[#c8e8c0]" : "text-[#7a9678]"}`}
            >
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 border px-4 py-3 transition-colors ${
        checked
          ? "border-[#00ff88]/30 bg-[#00ff88]/5"
          : "border-[#0f1a10] bg-[#0a1210] hover:border-[#1a2e1a]"
      }`}
    >
      <span
        className={`relative h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
          checked ? "border-[#00ff88] bg-[#00ff88]/20" : "border-[#2e4d30] bg-transparent"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            checked
              ? "left-[18px] bg-[#00ff88]"
              : "left-0.5 bg-[#2e4d30]"
          }`}
        />
      </span>
      <span className={`text-sm ${checked ? "text-[#c8e8c0]" : "text-[#7a9678]"}`}>
        {label}
      </span>
    </button>
  );
}

// ─── Step forms ────────────────────────────────────────────────────────────────

function Step1({
  data,
  onChange
}: {
  data: ProductProfile;
  onChange: (patch: Partial<ProductProfile>) => void;
}) {
  const showColdChain = COLD_CHAIN_CATS.has(data.category);
  const showShelfLife = SHELF_LIFE_CATS.has(data.category);
  const subcategoryOptions = data.category ? (SUBCATEGORIES[data.category] ?? []) : [];

  return (
    <div className="grid gap-5">
      <FieldWrap>
        <Label>Product name *</Label>
        <TextInput
          value={data.productName}
          onChange={(v) => onChange({ productName: v })}
          placeholder="e.g. Bolt Energy Drink"
        />
      </FieldWrap>

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldWrap>
          <Label>Category *</Label>
          <Select
            value={data.category}
            onChange={(v) =>
              onChange({ category: v, subcategory: "", needsColdChain: false, shelfLifeDays: null })
            }
            options={CATEGORIES}
            placeholder="Select category"
          />
        </FieldWrap>

        <FieldWrap>
          <Label>Subcategory *</Label>
          <Select
            value={data.subcategory}
            onChange={(v) => onChange({ subcategory: v })}
            options={subcategoryOptions}
            placeholder={data.category ? "Select subcategory" : "Select category first"}
          />
        </FieldWrap>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldWrap>
          <Label>Consumer price (₹) *</Label>
          <TextInput
            type="number"
            value={data.priceINR}
            onChange={(v) => onChange({ priceINR: Number(v) })}
            placeholder="e.g. 299"
          />
        </FieldWrap>

        <FieldWrap>
          <Label>Net margin to brand (%) *</Label>
          <TextInput
            type="number"
            value={data.marginPercent}
            onChange={(v) => onChange({ marginPercent: Number(v) })}
            placeholder="e.g. 40"
          />
        </FieldWrap>
      </div>

      <FieldWrap>
        <Label>Pack size / unit *</Label>
        <TextInput
          value={data.packSize}
          onChange={(v) => onChange({ packSize: v })}
          placeholder="e.g. 250ml bottle, 100g pack, 1 pair"
        />
      </FieldWrap>

      {showShelfLife && (
        <FieldWrap>
          <Label>Shelf life (days)</Label>
          <TextInput
            type="number"
            value={data.shelfLifeDays ?? ""}
            onChange={(v) =>
              onChange({ shelfLifeDays: v ? Number(v) : null })
            }
            placeholder="e.g. 180"
          />
        </FieldWrap>
      )}

      {showColdChain && (
        <FieldWrap>
          <Label>Cold chain requirement</Label>
          <Toggle
            checked={data.needsColdChain}
            onChange={(v) => onChange({ needsColdChain: v })}
            label="This product requires refrigerated storage or transport"
          />
        </FieldWrap>
      )}
    </div>
  );
}

function Step2({
  data,
  onChange
}: {
  data: ProductProfile;
  onChange: (patch: Partial<ProductProfile>) => void;
}) {
  return (
    <div className="grid gap-5">
      <FieldWrap>
        <Label>Brand name *</Label>
        <TextInput
          value={data.brandName}
          onChange={(v) => onChange({ brandName: v })}
          placeholder="e.g. Bolt Beverages"
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Brand maturity *</Label>
        <RadioGroup<BrandMaturity>
          value={data.brandMaturity}
          onChange={(v) => onChange({ brandMaturity: v })}
          options={[
            { value: "new", label: "New brand", description: "Pre-launch or under 12 months" },
            { value: "emerging", label: "Emerging — 1–3 years old", description: "Some traction, limited distribution" },
            { value: "established", label: "Established — 3+ years", description: "Proven sales, looking to expand" }
          ]}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Current sales channels</Label>
        <CheckboxGroup
          selected={data.currentChannels}
          onChange={(v) => onChange({ currentChannels: v })}
          options={CURRENT_CHANNEL_OPTIONS}
          exclusive="None yet"
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Current cities (if any)</Label>
        <TextInput
          value={data.currentCities}
          onChange={(v) => onChange({ currentCities: v })}
          placeholder="e.g. Mumbai, Bengaluru"
        />
      </FieldWrap>

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldWrap>
          <Label>Primary dispatch warehouse *</Label>
          <Select
            value={data.warehouseCity}
            onChange={(v) => onChange({ warehouseCity: v })}
            options={WAREHOUSE_CITIES}
            placeholder="Select city base"
          />
        </FieldWrap>

        <FieldWrap>
          <Label>Max distribution radius *</Label>
          <Select
            value={data.deliveryRadiusKM}
            onChange={(v) => onChange({ deliveryRadiusKM: Number(v) })}
            options={RADIUS_OPTIONS}
          />
        </FieldWrap>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FieldWrap>
          <Label>Monthly production capacity *</Label>
          <Select
            value={data.monthlyCapacityUnits}
            onChange={(v) => onChange({ monthlyCapacityUnits: v })}
            options={CAPACITY_OPTIONS}
            placeholder="Select capacity"
          />
        </FieldWrap>

        <FieldWrap>
          <Label>Launch budget *</Label>
          <Select
            value={data.launchBudgetINR}
            onChange={(v) => onChange({ launchBudgetINR: v })}
            options={BUDGET_OPTIONS}
            placeholder="Select range"
          />
        </FieldWrap>
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange
}: {
  data: ProductProfile;
  onChange: (patch: Partial<ProductProfile>) => void;
}) {
  return (
    <div className="grid gap-5">
      <FieldWrap>
        <Label>Primary target customer *</Label>
        <Select
          value={data.targetCustomer}
          onChange={(v) => onChange({ targetCustomer: v })}
          options={TARGET_CUSTOMERS}
          placeholder="Select customer segment"
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Target income band *</Label>
        <RadioGroup<IncomeTarget>
          value={data.incomeTarget}
          onChange={(v) => onChange({ incomeTarget: v })}
          options={[
            { value: "mass", label: "Mass market", description: "Household income ₹3–8L/yr — broad India" },
            { value: "mid", label: "Mid-income", description: "₹8–20L/yr — urban and semi-urban" },
            { value: "premium", label: "Premium", description: "₹20L+/yr — metros and affluent tier 2" }
          ]}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Preferred launch region *</Label>
        <RadioGroup<string>
          value={data.preferredRegion}
          onChange={(v) => onChange({ preferredRegion: v })}
          options={[
            { value: "all", label: "All India", description: "Let the platform rank every market" },
            { value: "metro", label: "Metro cities only", description: "Top 8 metros: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad" },
            { value: "tier2plus", label: "Tier 2 & 3 cities", description: "Avoid crowded metros, go for emerging markets" },
            { value: "specific", label: "Specific states / regions", description: "Enter preferred states or zones below" }
          ]}
        />
      </FieldWrap>

      {data.preferredRegion === "specific" && (
        <FieldWrap>
          <Label>Target states or regions *</Label>
          <TextInput
            value={data.specificRegion}
            onChange={(v) => onChange({ specificRegion: v })}
            placeholder="e.g. Maharashtra, Karnataka, South India"
          />
        </FieldWrap>
      )}
    </div>
  );
}

function Step4({
  data,
  onChange
}: {
  data: ProductProfile;
  onChange: (patch: Partial<ProductProfile>) => void;
}) {
  return (
    <div className="grid gap-5">
      <FieldWrap>
        <Label>Preferred distribution channels *</Label>
        <CheckboxGroup
          selected={data.preferredChannels}
          onChange={(v) => onChange({ preferredChannels: v })}
          options={CHANNEL_OPTIONS}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Distributor status *</Label>
        <RadioGroup<"yes" | "no" | "direct">
          value={data.hasDistributor}
          onChange={(v) => onChange({ hasDistributor: v })}
          options={[
            { value: "yes", label: "Yes — distributor(s) already onboarded" },
            { value: "no", label: "No — actively looking for distributors" },
            { value: "direct", label: "Going direct — no distributor needed" }
          ]}
        />
      </FieldWrap>
    </div>
  );
}

function Step5({
  data,
  onChange
}: {
  data: ProductProfile;
  onChange: (patch: Partial<ProductProfile>) => void;
}) {
  return (
    <div className="grid gap-5">
      <FieldWrap>
        <Label>Primary goal for this launch *</Label>
        <RadioGroup<string>
          value={data.primaryGoal}
          onChange={(v) => onChange({ primaryGoal: v })}
          options={[
            { value: "revenue", label: "Maximise revenue", description: "Prioritise top-line sales above all" },
            { value: "market_share", label: "Capture market share", description: "Win outlets and channels before profitability" },
            { value: "brand_awareness", label: "Build brand awareness", description: "Establish presence in target markets first" },
            { value: "profitability", label: "Achieve profitability", description: "Optimise margins and cost-to-serve from day one" }
          ]}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Launch timeline *</Label>
        <RadioGroup<string>
          value={data.launchTimeline}
          onChange={(v) => onChange({ launchTimeline: v })}
          options={[
            { value: "1month", label: "Within 1 month — urgent launch" },
            { value: "1quarter", label: "This quarter — 2–3 months" },
            { value: "6months", label: "Next 6 months — planned rollout" }
          ]}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>How will you measure success? *</Label>
        <RadioGroup<string>
          value={data.successMetric}
          onChange={(v) => onChange({ successMetric: v })}
          options={[
            { value: "units_sold", label: "Units sold" },
            { value: "revenue", label: "Total revenue (₹)" },
            { value: "outlets_activated", label: "Outlets / channels activated" },
            { value: "sell_through", label: "Sell-through rate (% sold vs. stocked)" }
          ]}
        />
      </FieldWrap>

      <FieldWrap>
        <Label>Key competitors (optional)</Label>
        <TextInput
          value={data.competitors}
          onChange={(v) => onChange({ competitors: v })}
          placeholder="e.g. Red Bull, Monster, Sting"
        />
      </FieldWrap>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProductProfile>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed seconds while analysis is running
  useState(() => {
    if (!isLoading) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  });

  const TOTAL_STEPS = 5;

  function patch(update: Partial<ProductProfile>) {
    setData((prev) => ({ ...prev, ...update }));
    setErrors([]);
  }

  function handleNext() {
    const errs = validateStep(step, data);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors([]);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    const errs = validateStep(step, data);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setPhaseIndex(0);

    try {
      // Phase 1: Extract calibrated features from structured profile
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: data })
      });

      if (!extractRes.ok) {
        const payload = (await extractRes.json()) as { message?: string };
        throw new Error(payload.message ?? "Feature extraction failed.");
      }

      const features = (await extractRes.json()) as ExtractedFeatures;
      setPhaseIndex(1);

      // Phase 2-3: Score all cities using dynamic database data & profiles
      await new Promise((r) => setTimeout(r, 400)); // UX pause
      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, profile: data })
      });

      if (!scoreRes.ok) {
        const payload = (await scoreRes.json()) as { message?: string };
        throw new Error(payload.message ?? "Scoring calculation failed.");
      }

      const scores = (await scoreRes.json()) as ScoredCity[];
      setPhaseIndex(2);

      const promptSummary = `${data.productName} — ${data.subcategory} at ₹${data.priceINR} (${data.marginPercent}% margin). dispatch from: ${data.warehouseCity}. Target: ${data.targetCustomer}.`;

      // Phase 4: Generate strategy memo
      const memoRes = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, scores, prompt: promptSummary })
      });

      if (!memoRes.ok) {
        const payload = (await memoRes.json()) as { message?: string };
        throw new Error(payload.message ?? "Strategy memo failed.");
      }

      const { memo } = (await memoRes.json()) as { memo: string };
      setPhaseIndex(3);

      const result: AnalysisResult = {
        features,
        scores,
        memo,
        prompt: promptSummary,
        profile: data
      };

      window.localStorage.setItem("distributio_result", JSON.stringify(result));
      router.push("/results");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong during analysis."
      );
      setIsLoading(false);
      setPhaseIndex(0);
    }
  }

  // ─── Loading screen ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#050810] px-6">
        <section className="w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            <span>distribut.io</span>
            <span>live analysis</span>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-6 sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-55" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-[#00ff88]" />
                </span>
                <p className="font-heading text-2xl font-bold uppercase text-accent sm:text-3xl">
                  {LOADING_PHASES[phaseIndex]}
                </p>
              </div>
              <span className="flex-shrink-0 font-mono text-lg text-[#2e4d30]">
                {elapsed}s
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden bg-[#111c12]">
              <div
                className="h-full bg-[#00ff88] transition-all duration-700"
                style={{ width: `${((phaseIndex + 1) / LOADING_PHASES.length) * 100}%` }}
              />
            </div>
            <div className="mt-6 grid gap-3">
              {LOADING_PHASES.map((phase, index) => (
                <div
                  key={phase}
                  className={`flex items-center justify-between border border-[#0f1a10] px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    index <= phaseIndex ? "text-[#c8e8c0]" : "text-[#2e4d30]"
                  }`}
                >
                  <span>{phase}</span>
                  {index === phaseIndex ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <span>{index < phaseIndex ? "DONE" : "QUEUED"}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              {data.productName && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
                  {data.productName} · ₹{data.priceINR}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
                {elapsed < 15 ? "Gemini is thinking..." : elapsed < 35 ? "Almost there..." : "Final touches..."}
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ─── Form screen ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-12">
      {/* Nav */}
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 py-3">
        <a
          href="/"
          className="font-heading text-xl font-extrabold tracking-tight text-accent"
        >
          distribut.io
        </a>
        <p className="text-right text-[9px] uppercase tracking-[0.2em] text-[#2e4d30] sm:text-[10px]">
          PRODUCT PROFILE BUILDER
        </p>
      </nav>

      <div className="mx-auto mt-6 max-w-3xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
              {Math.round((step / TOTAL_STEPS) * 100)}%
            </p>
          </div>
          <div className="h-px w-full bg-[#0f1a10]">
            <div
              className="h-px bg-[#00ff88] transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="mt-3 flex gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1 w-full ${
                    i + 1 <= step ? "bg-[#00ff88]" : "bg-[#0f1a10]"
                  }`}
                />
                <span
                  className={`hidden text-[9px] uppercase tracking-[0.15em] sm:block ${
                    i + 1 === step
                      ? "text-accent"
                      : i + 1 < step
                      ? "text-[#7a9678]"
                      : "text-[#2e4d30]"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="border border-[#0f1a10] bg-[#0a1210] p-6 sm:p-8">
          <h1 className="mb-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">
            {step === 1 && "Product details"}
            {step === 2 && "Business context"}
            {step === 3 && "Target market"}
            {step === 4 && "Distribution channels"}
            {step === 5 && "Goals & success metrics"}
          </h1>
          <p className="mb-7 text-sm text-[#7a9678]">
            {step === 1 && "Tell us what you're selling and its key physical attributes."}
            {step === 2 && "Help us understand your brand, capacity, and budget constraints."}
            {step === 3 && "Who are you selling to, and where are you focusing?"}
            {step === 4 && "How do you want to reach your customer?"}
            {step === 5 && "What does a successful launch look like for you?"}
          </p>

          {step === 1 && <Step1 data={data} onChange={patch} />}
          {step === 2 && <Step2 data={data} onChange={patch} />}
          {step === 3 && <Step3 data={data} onChange={patch} />}
          {step === 4 && <Step4 data={data} onChange={patch} />}
          {step === 5 && <Step5 data={data} onChange={patch} />}

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="mt-6 border border-[#ff3355]/25 bg-[#ff3355]/10 p-4">
              {errors.map((err) => (
                <p key={err} className="text-sm leading-6 text-[#ff879b]">
                  • {err}
                </p>
              ))}
            </div>
          )}

          {/* Analysis error */}
          {errorMessage && (
            <p className="mt-6 border border-[#ff3355]/25 bg-[#ff3355]/10 p-4 text-sm leading-6 text-[#ff879b]">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="mt-4 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex min-h-12 items-center gap-2 border border-[#0f1a10] bg-[#0a1210] px-5 text-[10px] uppercase tracking-[0.2em] text-[#c8e8c0] transition hover:border-[#00ff88]/40 hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex min-h-12 items-center gap-2 border border-[#0f1a10] bg-[#0a1210] px-5 text-[10px] uppercase tracking-[0.2em] text-[#c8e8c0] transition hover:border-[#00ff88]/40 hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </a>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-12 items-center gap-2 border border-[#00ff88] bg-[#00ff88] px-6 text-sm font-medium uppercase tracking-[0.2em] text-[#031009] transition hover:bg-[#78ffbd]"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex min-h-12 items-center gap-2 border border-[#00ff88] bg-[#00ff88] px-6 text-sm font-medium uppercase tracking-[0.2em] text-[#031009] transition hover:bg-[#78ffbd]"
            >
              Run analysis
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
