"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="mr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif',
          background: "#fff8f1",
          color: "#3b2416",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontWeight: 700, color: "#c74407" }}>परमानंद धाम</p>
          <h1 style={{ fontSize: 28, margin: "8px 0" }}>अ‍ॅप त्रुटी</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
            जुना कॅशे किंवा मृत पूर्वावलोकन लिंक यामुळे हे होऊ शकते. पुन्हा प्रयत्न करा.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                if ("serviceWorker" in navigator) {
                  void navigator.serviceWorker.getRegistrations().then((regs) => {
                    for (const r of regs) void r.unregister();
                  });
                }
                if ("caches" in window) {
                  void caches.keys().then((keys) => {
                    for (const k of keys) void caches.delete(k);
                  });
                }
              } catch {
                /* ignore */
              }
              reset();
              window.location.href = "/i";
            }}
            style={{
              marginTop: 16,
              width: "100%",
              border: 0,
              borderRadius: 16,
              background: "#c74407",
              color: "#fff",
              fontWeight: 700,
              padding: "14px 16px",
              fontSize: 16,
            }}
          >
            कॅशे साफ · पुन्हा सुरू
          </button>
        </div>
      </body>
    </html>
  );
}
