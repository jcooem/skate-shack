import { HOLLOW_SUGGESTIONS, PROFILE_SUGGESTIONS, SKATE_TYPES } from "@/lib/constants";
import { Checkbox, Field, inputClass } from "@/components/ui";

/** Suggestion lists for hollow/profile inputs. Render once per page. */
export function SharpenDatalists() {
  return (
    <>
      <datalist id="hollow-suggestions">
        {HOLLOW_SUGGESTIONS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <datalist id="profile-suggestions">
        {PROFILE_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}

type CustomerLike = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  preferredHollow: string;
  preferredProfile: string;
  sharpenNotes: string;
  ownerNotes?: string;
};

/** Customer details + sharpening preferences. `admin` adds email and private owner notes. */
export function CustomerFields({ customer, admin = false }: { customer?: CustomerLike; admin?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name">
        <input name="firstName" required defaultValue={customer?.firstName} autoComplete="given-name" className={inputClass} />
      </Field>
      <Field label="Last name">
        <input name="lastName" defaultValue={customer?.lastName} autoComplete="family-name" className={inputClass} />
      </Field>
      {admin && (
        <Field label="Email" hint="Lets the customer sign in and see their history. Optional.">
          <input name="email" type="email" defaultValue={customer?.email ?? ""} className={inputClass} />
        </Field>
      )}
      <Field label="Phone">
        <input name="phone" type="tel" defaultValue={customer?.phone} autoComplete="tel" className={inputClass} />
      </Field>
      <Field label="Preferred hollow" hint={'e.g. 1/2" or FBV 100'}>
        <input name="preferredHollow" list="hollow-suggestions" defaultValue={customer?.preferredHollow} className={inputClass} />
      </Field>
      <Field label="Preferred profile" hint="e.g. 10 ft, Quad, factory">
        <input name="preferredProfile" list="profile-suggestions" defaultValue={customer?.preferredProfile} className={inputClass} />
      </Field>
      <Field label="Sharpening notes" className="sm:col-span-2" hint="Anything we should know: bite, glide, position played…">
        <textarea name="sharpenNotes" rows={3} defaultValue={customer?.sharpenNotes} className={inputClass} />
      </Field>
      {admin && (
        <Field label="Private owner notes" className="sm:col-span-2" hint="Only visible to you.">
          <textarea name="ownerNotes" rows={2} defaultValue={customer?.ownerNotes} className={inputClass} />
        </Field>
      )}
    </div>
  );
}

type SkateLike = {
  label: string;
  skateType: string;
  brand: string;
  model: string;
  size: string;
  holderBlade: string;
  preferredHollow: string;
  notes: string;
  active: boolean;
};

export function SkateFields({ skate }: { skate?: SkateLike }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nickname" hint='e.g. "Game skates", "Backup pair"'>
        <input name="label" defaultValue={skate?.label} className={inputClass} />
      </Field>
      <Field label="Type">
        <select name="skateType" defaultValue={skate?.skateType ?? "HOCKEY_PLAYER"} className={inputClass}>
          {Object.entries(SKATE_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Brand">
        <input name="brand" defaultValue={skate?.brand} placeholder="Bauer, CCM, True, Jackson…" className={inputClass} />
      </Field>
      <Field label="Model">
        <input name="model" defaultValue={skate?.model} className={inputClass} />
      </Field>
      <Field label="Size">
        <input name="size" defaultValue={skate?.size} placeholder="e.g. 8.5 D" className={inputClass} />
      </Field>
      <Field label="Holder / blade">
        <input name="holderBlade" defaultValue={skate?.holderBlade} placeholder="e.g. Tuuk LS4, XS Black" className={inputClass} />
      </Field>
      <Field label="Hollow for this pair" hint="Leave blank to use the usual preference.">
        <input name="preferredHollow" list="hollow-suggestions" defaultValue={skate?.preferredHollow} className={inputClass} />
      </Field>
      <Field label="Notes">
        <input name="notes" defaultValue={skate?.notes} className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox name="active" label="Still using these skates" defaultChecked={skate?.active ?? true} />
      </div>
    </div>
  );
}
