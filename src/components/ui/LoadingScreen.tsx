export default function LoadingScreen() {
  return (
    <>
      <style>{`
        @keyframes a51-eye-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes a51-eye-glow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        @keyframes a51-scan {
          0%   { transform: translateY(-72px); opacity: 0; }
          12%  { opacity: 0.9; }
          88%  { opacity: 0.9; }
          100% { transform: translateY(72px); opacity: 0; }
        }
        @keyframes a51-outer-ring {
          0%, 100% { stroke-opacity: 0.08; }
          50%       { stroke-opacity: 0.22; }
        }
        @keyframes a51-dot {
          0%, 80%, 100% { opacity: 0.18; transform: scale(0.75); }
          40%           { opacity: 1;    transform: scale(1); }
        }
        @keyframes a51-label {
          0%, 88%, 100% { opacity: 0.85; }
          90%  { opacity: 0.3; }
          92%  { opacity: 0.85; }
          94%  { opacity: 0.5; }
          96%  { opacity: 0.85; }
        }
        .a51-eye    { animation: a51-eye-pulse 2.4s ease-in-out infinite; }
        .a51-eye-r  { animation: a51-eye-pulse 2.4s ease-in-out infinite 0.5s; }
        .a51-glow   { animation: a51-eye-glow  2.4s ease-in-out infinite; }
        .a51-glow-r { animation: a51-eye-glow  2.4s ease-in-out infinite 0.5s; }
        .a51-scan   { animation: a51-scan 3s ease-in-out infinite; }
        .a51-ring   { animation: a51-outer-ring 3.5s ease-in-out infinite; }
        .a51-dot-1  { animation: a51-dot 1.6s ease-in-out infinite 0s; }
        .a51-dot-2  { animation: a51-dot 1.6s ease-in-out infinite 0.28s; }
        .a51-dot-3  { animation: a51-dot 1.6s ease-in-out infinite 0.56s; }
        .a51-label  { animation: a51-label 8s ease-in-out infinite; }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(140,255,89,0.06) 0%, transparent 100%), #121212",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {/* Alien figure + scan line */}
        <div style={{ position: "relative", width: 140, height: 180, marginBottom: 32 }}>
          {/* Scan line clipped to container */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            <div
              className="a51-scan"
              style={{
                position: "absolute",
                left: "-20%",
                right: "-20%",
                top: "50%",
                height: 1.5,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(140,255,89,0.8) 30%, rgba(182,255,132,1) 50%, rgba(140,255,89,0.8) 70%, transparent 100%)",
                boxShadow: "0 0 8px rgba(140,255,89,0.6)",
              }}
            />
          </div>

          <svg
            viewBox="0 0 140 180"
            width="140"
            height="180"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: "visible", display: "block" }}
          >
            <defs>
              <radialGradient id="a51-hg" cx="40%" cy="28%" r="65%">
                <stop offset="0%" stopColor="#22271c" />
                <stop offset="70%" stopColor="#161a12" />
                <stop offset="100%" stopColor="#0e1009" />
              </radialGradient>
              <radialGradient id="a51-el" cx="30%" cy="25%" r="75%">
                <stop offset="0%" stopColor="#d4ffb0" />
                <stop offset="40%" stopColor="#8cff59" />
                <stop offset="100%" stopColor="#1c5006" />
              </radialGradient>
              <radialGradient id="a51-eg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(140,255,89,0.55)" />
                <stop offset="100%" stopColor="rgba(140,255,89,0)" />
              </radialGradient>
            </defs>

            {/* Outer glow ring */}
            <path
              d="M 70 6 C 118 6 132 42 130 90 C 128 145 104 172 70 174 C 36 172 12 145 10 90 C 8 42 22 6 70 6 Z"
              fill="none"
              stroke="rgba(140,255,89,1)"
              strokeWidth="0.8"
              className="a51-ring"
            />

            {/* Head silhouette — single elongated shape */}
            <path
              d="M 70 14 C 108 14 120 46 118 88 C 116 138 98 164 70 166 C 42 164 24 138 22 88 C 20 46 32 14 70 14 Z"
              fill="url(#a51-hg)"
              stroke="rgba(140,255,89,0.18)"
              strokeWidth="0.8"
            />

            {/* Left eye — glow halo */}
            <ellipse
              cx="46" cy="80" rx="26" ry="16"
              fill="url(#a51-eg)"
              transform="rotate(-18 46 80)"
              className="a51-glow"
            />
            {/* Left eye socket */}
            <ellipse
              cx="46" cy="80" rx="21" ry="13"
              fill="#090d07"
              transform="rotate(-18 46 80)"
            />
            {/* Left iris */}
            <ellipse
              cx="46" cy="80" rx="18" ry="11"
              fill="url(#a51-el)"
              transform="rotate(-18 46 80)"
              className="a51-eye"
            />
            {/* Left pupil */}
            <ellipse
              cx="46" cy="80" rx="9" ry="5.5"
              fill="#040804"
              transform="rotate(-18 46 80)"
            />
            {/* Left reflection */}
            <ellipse
              cx="41" cy="76" rx="4" ry="2.5"
              fill="rgba(210,255,180,0.6)"
              transform="rotate(-18 46 80)"
            />
            {/* Left rim */}
            <ellipse
              cx="46" cy="80" rx="18" ry="11"
              fill="none"
              stroke="rgba(140,255,89,0.45)"
              strokeWidth="1.2"
              transform="rotate(-18 46 80)"
              className="a51-eye"
            />

            {/* Right eye — glow halo */}
            <ellipse
              cx="94" cy="80" rx="26" ry="16"
              fill="url(#a51-eg)"
              transform="rotate(18 94 80)"
              className="a51-glow-r"
            />
            {/* Right eye socket */}
            <ellipse
              cx="94" cy="80" rx="21" ry="13"
              fill="#090d07"
              transform="rotate(18 94 80)"
            />
            {/* Right iris */}
            <ellipse
              cx="94" cy="80" rx="18" ry="11"
              fill="url(#a51-el)"
              transform="rotate(18 94 80)"
              className="a51-eye-r"
            />
            {/* Right pupil */}
            <ellipse
              cx="94" cy="80" rx="9" ry="5.5"
              fill="#040804"
              transform="rotate(18 94 80)"
            />
            {/* Right reflection */}
            <ellipse
              cx="89" cy="76" rx="4" ry="2.5"
              fill="rgba(210,255,180,0.6)"
              transform="rotate(18 94 80)"
            />
            {/* Right rim */}
            <ellipse
              cx="94" cy="80" rx="18" ry="11"
              fill="none"
              stroke="rgba(140,255,89,0.45)"
              strokeWidth="1.2"
              transform="rotate(18 94 80)"
              className="a51-eye-r"
            />
          </svg>
        </div>

        {/* Brand + dots */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span
            className="a51-label"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: "10px",
              letterSpacing: "0.6em",
              color: "#8cff59",
              textTransform: "uppercase",
              paddingLeft: "0.6em",
            }}
          >
            Area 51 signal
          </span>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {(["a51-dot-1", "a51-dot-2", "a51-dot-3"] as const).map((cls) => (
              <div
                key={cls}
                className={cls}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#8cff59",
                  boxShadow: "0 0 7px rgba(140,255,89,0.9)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
