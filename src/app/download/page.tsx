import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download source — ARINX",
  description: "Download the ARINX front-end source files straight to your device.",
};

const FILES = [
  {
    name: "page.tsx",
    badge: "TSX",
    label: "page.tsx",
    size: "111 KB",
    desc: "The complete ARINX interface — home feed, watch page, Shorts, Creator Studio, admin console and all dialogs. React + Tailwind.",
  },
  {
    name: "globals.css",
    badge: "CSS",
    label: "globals.css",
    size: "2.5 KB",
    desc: "The blue-metal theme, the ARINX wordmark gradient and the self-hosted brand font declaration.",
  },
  {
    name: "layout.tsx",
    badge: "TS",
    label: "layout.tsx",
    size: "1 KB",
    desc: "Document metadata, canonical URL handling and the root layout shell.",
  },
  {
    name: "arinx.html",
    badge: "HTML",
    label: "arinx.html",
    size: "58 KB",
    desc: "The standalone single-file edition — all CSS merged into one <style> tag, font and catalogue embedded. Opens with no build step.",
  },
];

export default function DownloadPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#eef3fb 0%,#f3f6fb 100%)",
        color: "#0f172a",
        fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
        padding: "24px 16px 56px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#0b4fd8",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 18,
          }}
        >
          ← Back to ARINX
        </a>

        <div
          style={{
            background: "#fff",
            border: "1px solid #dbe6f5",
            borderRadius: 18,
            padding: "20px 18px",
            boxShadow: "0 2px 14px rgba(15,50,110,.06)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-0.01em" }}>
            Download ARINX source
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>
            Tap a button and the file is saved straight to your phone&apos;s storage. This works even
            where copy-pasting fails — <b>page.tsx is 111&nbsp;KB</b>, which is far too large for a
            phone clipboard to carry without being cut off.
          </p>

          <ul style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "grid", gap: 12 }}>
            {FILES.map((f) => (
              <li
                key={f.name}
                style={{
                  border: "1px solid #dbe6f5",
                  borderRadius: 14,
                  padding: "14px",
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      background: "#e6efff",
                      color: "#0b4fd8",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: ".06em",
                      padding: "4px 8px",
                      borderRadius: 7,
                      flexShrink: 0,
                    }}
                  >
                    {f.badge}
                  </span>
                  <b style={{ fontSize: 15, flex: 1, minWidth: 0, wordBreak: "break-all" }}>{f.label}</b>
                  <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{f.size}</span>
                </div>
                <p style={{ margin: "8px 0 12px", fontSize: 12.5, lineHeight: 1.55, color: "#64748b" }}>
                  {f.desc}
                </p>
                <a
                  href={`/api/download?file=${encodeURIComponent(f.name)}`}
                  download={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "linear-gradient(180deg,#287ded,#0b4fd8)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "12px 18px",
                    borderRadius: 999,
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(11,79,216,.28)",
                  }}
                >
                  ⬇ Download {f.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            marginTop: 18,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 12,
            lineHeight: 1.65,
          }}
        >
          <b>About these files.</b> They are presentation files only — the ARINX interface, its theme
          and metadata. Server-side modules, database credentials and administrative configuration are
          <b> intentionally excluded</b> and cannot be downloaded from this page. Nothing here contains
          passwords, API keys or account data.
        </div>

        <p style={{ marginTop: 16, fontSize: 11, color: "#94a3b8", lineHeight: 1.6, textAlign: "center" }}>
          ARINX — Your World. Your Videos.
        </p>
      </div>
    </main>
  );
}
