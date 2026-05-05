import Link from "next/link";

export default function SiteFooter({ tenant, lines }) {
  const name = tenant.name || "Cabinet & Remodeling Depot";
  const primaryColor = tenant.primary_color || "#1C1917";

  return (
    <footer
      className="border-t isolate"
      style={{ backgroundColor: primaryColor, borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 sm:gap-12 items-start">

          {/* Brand card */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo_url}
                  alt={name}
                  className="h-[54px] sm:h-[66px] w-auto mb-5 mix-blend-multiply"
                />
              ) : (
                <p
                  className="font-bold text-lg mb-4"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: primaryColor }}
                >
                  {name}
                </p>
              )}
              <p className="text-stone-500 text-sm leading-relaxed mb-5">
                Quality cabinetry crafted for every space — from kitchens to bathrooms and beyond.
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 border-b pb-0.5 hover:opacity-70"
                style={{ color: primaryColor, borderColor: `${primaryColor}35` }}
              >
                Browse Collections
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Navigate</p>
            <ul className="space-y-3">
              {[
                { href: "/", label: "Home" },
                { href: "/catalog", label: "All Collections" },
                { href: "/catalog/design", label: "Design with AI" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          {lines.length > 0 && (
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Collections</p>
              <ul className="space-y-3">
                {lines.slice(0, 6).map((line) => (
                  <li key={line.id}>
                    <Link
                      href={`/catalog/${line.slug}`}
                      className="text-white/55 hover:text-white text-sm transition-colors duration-150"
                    >
                      {line.name}
                    </Link>
                  </li>
                ))}
                {lines.length > 6 && (
                  <li>
                    <Link href="/catalog" className="text-white/30 hover:text-white/55 text-xs transition-colors duration-150">
                      + {lines.length - 6} more
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] mb-5">Get in Touch</p>
            <ul className="space-y-4">
              {tenant.contact_email && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <a href={`mailto:${tenant.contact_email}`} className="text-white/55 hover:text-white text-sm transition-colors duration-150 break-all">
                    {tenant.contact_email}
                  </a>
                </li>
              )}
              {tenant.contact_phone && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <a href={`tel:${tenant.contact_phone}`} className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {tenant.contact_phone}
                  </a>
                </li>
              )}
              {tenant.website_url && (
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-white/25 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <a href={tenant.website_url} target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-white text-sm transition-colors duration-150">
                    {tenant.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.07]">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
