import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney, plural } from "@/lib/format";
import { BladeIcon } from "@/components/brand";

export default async function HomePage() {
  const settings = await getSettings();
  const products = await prisma.product.findMany({
    where: { active: true, showOnPublicPage: true },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
  });
  const services = products.filter((p) => p.kind === "SERVICE");
  const cards = products.filter((p) => p.kind === "CARD");
  // Compare card value against the cheapest single-credit sharpen.
  const baseSharpen = services.filter((s) => s.credits === 1).sort((a, b) => a.priceCents - b.priceCents)[0];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-rink-900 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60rem 30rem at 85% -10%, rgba(56,189,248,.35), transparent 60%), radial-gradient(40rem 20rem at -10% 110%, rgba(14,165,233,.25), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ice-400">Skate sharpening</p>
            <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide md:text-7xl">
              {settings.businessName}
            </h1>
            {settings.tagline && <p className="mt-5 max-w-xl text-lg text-ice-100">{settings.tagline}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#services" className="rounded-lg bg-ice-500 px-5 py-3 text-sm font-semibold text-white hover:bg-ice-400">
                See prices
              </a>
              <Link href="/login" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Check my card balance
              </Link>
            </div>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="grid h-56 w-56 place-items-center rounded-full border border-white/15 bg-white/5 text-ice-200">
              <BladeIcon className="h-32 w-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Services & cards */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16">
        <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-slate-900">Services &amp; prices</h2>
        <p className="mt-2 max-w-2xl text-slate-600">Bring your skates in and tell us how you like them — we keep your preferences on file for next time.</p>

        {services.length === 0 && cards.length === 0 && <p className="mt-8 text-slate-500">Prices coming soon.</p>}

        {services.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <article key={s.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
                {s.description && <p className="mt-2 flex-1 text-sm text-slate-600">{s.description}</p>}
                <p className="mt-4 text-3xl font-bold text-slate-900">{formatMoney(s.priceCents)}</p>
                {cards.length > 0 && <p className="mt-1 text-xs text-slate-500">or {plural(s.credits, "credit")} from a sharpening card</p>}
              </article>
            ))}
          </div>
        )}

        {cards.length > 0 && (
          <>
            <h3 className="mt-14 font-display text-3xl font-bold uppercase tracking-wide text-slate-900">Sharpening cards</h3>
            <p className="mt-2 max-w-2xl text-slate-600">
              Prepay and save. Your card balance is tracked for you — sign in any time to see how many sharpens you have left.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const perSharpen = Math.round(c.priceCents / c.credits);
                const savings = baseSharpen ? baseSharpen.priceCents * c.credits - c.priceCents : 0;
                return (
                  <article key={c.id} className="relative flex flex-col overflow-hidden rounded-xl bg-rink-900 p-6 text-white shadow-md">
                    <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-ice-500/20" />
                    <h4 className="text-lg font-semibold">{c.name}</h4>
                    <p className="mt-1 text-sm text-ice-200">{plural(c.credits, "sharpen")}</p>
                    {c.description && <p className="mt-3 flex-1 text-sm text-ice-100">{c.description}</p>}
                    <p className="mt-4 text-3xl font-bold">{formatMoney(c.priceCents)}</p>
                    <p className="mt-1 text-xs text-ice-200">
                      {formatMoney(perSharpen)} per sharpen
                      {savings > 0 && <> · save {formatMoney(savings)}</>}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            ["Drop off", "Bring in your skates. Tell us your hollow and profile, or we'll help you pick one."],
            ["We sharpen", "Every pair is checked for level edges and finished by hand."],
            ["Track it", "Sign in to see your sharpening history, preferences and card balance."],
          ].map(([title, body], i) => (
            <div key={title}>
              <div className="font-display text-4xl font-bold text-ice-500">0{i + 1}</div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About & contact */}
      {(settings.aboutText || settings.hours || settings.address || settings.phone || settings.contactEmail) && (
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr]">
          <div>
            {settings.aboutText && (
              <>
                <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-slate-900">About us</h2>
                <p className="mt-4 whitespace-pre-line text-slate-700">{settings.aboutText}</p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Visit us</h2>
            <dl className="mt-4 space-y-4 text-sm">
              {settings.hours && (
                <div>
                  <dt className="font-medium text-slate-500">Hours</dt>
                  <dd className="mt-1 whitespace-pre-line text-slate-800">{settings.hours}</dd>
                </div>
              )}
              {settings.address && (
                <div>
                  <dt className="font-medium text-slate-500">Address</dt>
                  <dd className="mt-1 whitespace-pre-line text-slate-800">{settings.address}</dd>
                </div>
              )}
              {settings.phone && (
                <div>
                  <dt className="font-medium text-slate-500">Phone</dt>
                  <dd className="mt-1">
                    <a className="text-ice-700 hover:underline" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
                      {settings.phone}
                    </a>
                  </dd>
                </div>
              )}
              {settings.contactEmail && (
                <div>
                  <dt className="font-medium text-slate-500">Email</dt>
                  <dd className="mt-1">
                    <a className="text-ice-700 hover:underline" href={`mailto:${settings.contactEmail}`}>
                      {settings.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}
    </main>
  );
}
