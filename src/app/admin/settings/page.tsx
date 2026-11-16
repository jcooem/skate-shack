import type { Metadata } from "next";
import { requireOwner } from "@/lib/authz";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { BladeIcon } from "@/components/brand";
import { Card, Checkbox, Field, inputClass, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Branding & settings" };

export default async function SettingsPage() {
  await requireOwner();
  const s = await getSettings();

  return (
    <>
      <PageHeader title="Branding & settings" description="Your business name, logo and contact details appear across the whole site." />
      <ActionForm action={saveSettings} className="space-y-6">
        <Card title="Brand">
          <div className="grid gap-6 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <Field label="Business name">
                <input name="businessName" required defaultValue={s.businessName} className={inputClass} />
              </Field>
              <Field label="Tagline" hint="Shown under your name on the home page.">
                <input name="tagline" defaultValue={s.tagline} className={inputClass} />
              </Field>
              <Field label="Logo" hint="PNG, JPG or WebP, up to 1 MB. A square image works best.">
                <input
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ice-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ice-700 hover:file:bg-ice-100"
                />
              </Field>
              {s.logoUrl && <Checkbox name="removeLogo" label="Remove current logo" />}
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">Current logo</div>
              <div className="grid aspect-square place-items-center rounded-xl bg-rink-900 p-6">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt="Current logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <BladeIcon className="h-20 w-20 text-ice-200" />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card title="About & contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="About your business" className="sm:col-span-2" hint="A few sentences for the home page.">
              <textarea name="aboutText" rows={4} defaultValue={s.aboutText} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" defaultValue={s.phone} className={inputClass} />
            </Field>
            <Field label="Contact email">
              <input name="contactEmail" type="email" defaultValue={s.contactEmail} className={inputClass} />
            </Field>
            <Field label="Address">
              <textarea name="address" rows={3} defaultValue={s.address} className={inputClass} />
            </Field>
            <Field label="Hours">
              <textarea name="hours" rows={3} defaultValue={s.hours} placeholder={"Mon–Fri 4–8pm\nSat 9am–2pm"} className={inputClass} />
            </Field>
          </div>
        </Card>

        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
      </ActionForm>
    </>
  );
}
