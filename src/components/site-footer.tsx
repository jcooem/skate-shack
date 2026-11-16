import { getSettings } from "@/lib/settings";

export async function SiteFooter() {
  const s = await getSettings();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500">
        <span>
          © {new Date().getFullYear()} {s.businessName}
        </span>
        <span className="flex flex-wrap gap-4">
          {s.phone && <a href={`tel:${s.phone.replace(/[^+\d]/g, "")}`}>{s.phone}</a>}
          {s.contactEmail && <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>}
        </span>
      </div>
    </footer>
  );
}
