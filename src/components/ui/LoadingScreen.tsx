export default function LoadingScreen() {
  return (
    <>
      <style>{`
        @keyframes a51-eye-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes a51-eye-glow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.55; }
        }
        @keyframes a51-scan {
          0%   { transform: translateY(-90px); opacity: 0; }
          12%  { opacity: 0.9; }
          88%  { opacity: 0.9; }
          100% { transform: translateY(90px); opacity: 0; }
        }
        @keyframes a51-outer-ring {
          0%, 100% { stroke-opacity: 0.12; }
          50%       { stroke-opacity: 0.28; }
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
        .a51-eye      { animation: a51-eye-pulse 2.4s ease-in-out infinite; }
        .a51-eye-r    { animation: a51-eye-pulse 2.4s ease-in-out infinite 0.5s; }
        .a51-glow     { animation: a51-eye-glow  2.4s ease-in-out infinite; }
        .a51-glow-r   { animation: a51-eye-glow  2.4s ease-in-out infinite 0.5s; }
        .a51-scan     { animation: a51-scan 3s ease-in-out infinite; }
        .a51-ring     { animation: a51-outer-ring 3.5s ease-in-out infinite; }
        .a51-dot-1    { animation: a51-dot 1.6s ease-in-out infinite 0s; }
        .a51-dot-2    { animation: a51-dot 1.6s ease-in-out infinite 0.28s; }
        .a51-dot-3    { animation: a51-dot 1.6s ease-in-out infinite 0.56s; }
        .a51-label    { animation: a51-label 8s ease-in-out infinite; }
      `}</style>

      {/* Full-screen backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(140,255,89,0.07) 0%, transparent 100%), #121212",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {/* CRT scanlines overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.045) 3px, rgba(0,0,0,0.045) 4px)",
            pointerEvents: "none",
          }}
        />

        {/* Alien figure + scan line */}
        <div
          style={{
            position: "relative",
            width: 190,
            height: 252,
            marginBottom: 36,
          }}
        >
          {/* Scan line clipped to this container */}
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
                left: "-15%",
                right: "-15%",
                top: "50%",
                height: 2,
                background:
                  "linear-gradient(90deg, transparent 0%, transparent 8%, rgba(140,255,89,0.85) 35%, rgba(182,255,132,1) 50%, rgba(140,255,89,0.85) 65%, transparent 92%, transparent 100%)",
                boxShadow: "0 0 10px rgba(140,255,89,0.7)",
              }}
            />
          </div>

          <svg
            viewBox="0 0 190 252"
            width="190"
            height="252"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: "visible", display: "block" }}
          >
            <defs>
              {/* Head gradient */}
              <radialGradient id="a51-hg" cx="42%" cy="32%" r="62%">
                <stop offset="0%" stopColor="#252b20" />
                <stop offset="65%" stopColor="#191d14" />
                <stop offset="100%" stopColor="#10130d" />
              </radialGradient>

              {/* Eye iris gradient */}
              <radialGradient id="a51-el" cx="32%" cy="28%" r="72%">
                <stop offset="0%" stopColor="#d4ffb0" />
                <stop offset="45%" stopColor="#8cff59" />
                <stop offset="100%" stopColor="#1e5508" />
              </radialGradient>
              <radialGradient id="a51-er" cx="32%" cy="28%" r="72%">
                <stop offset="0%" stopColor="#d4ffb0" />
                <stop offset="45%" stopColor="#8cff59" />
                <stop offset="100%" stopColor="#1e5508" />
              </radialGradient>

              {/* Eye outer glow gradient */}
              <radialGradient id="a51-eg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(140,255,89,0.5)" />
                <stop offset="100%" stopColor="rgba(140,255,89,0)" />
              </radialGradient>
            </defs>

            {/* Outer glow ring */}
            <ellipse
              cx="95"
              cy="110"
              rx="80"
              ry="100"
              fill="none"
              stroke="rgba(140,255,89,1)"
              strokeWidth="1"
              className="a51-ring"
            />

            {/* Head */}
            <ellipse
              cx="95"
              cy="110"
              rx="72"
              ry="93"
              fill="url(#a51-hg)"
              stroke="rgba(140,255,89,0.22)"
              strokeWidth="1"
            />

            {/* Head specular highlight */}
            <ellipse
              cx="76"
              cy="65"
              rx="26"
              ry="15"
              fill="rgba(255,255,255,0.04)"
              transform="rotate(-12 76 65)"
            />

            {/* Neck */}
            <rect
              x="77"
              y="198"
              width="36"
              height="46"
              rx="9"
              fill="url(#a51-hg)"
              stroke="rgba(140,255,89,0.14)"
              strokeWidth="1"
            />

            {/* Left eye */}
            {/* Socket shadow */}
            <ellipse
              cx="62"
              cy="104"
              rx="28"
              ry="19"
              fill="#0b0f08"
              transform="rotate(-20 62 104)"
            />
            {/* Outer glow halo */}
            <ellipse
              cx="62"
              cy="104"
              rx="32"
              ry="22"
              fill="url(#a51-eg)"
              transform="rotate(-20 62 104)"
              className="a51-glow"
            />
            {/* Iris */}
            <ellipse
              cx="62"
              cy="104"
              rx="24"
              ry="15"
              fill="url(#a51-el)"
              transform="rotate(-20 62 104)"
              className="a51-eye"
            />
            {/* Pupil */}
            <ellipse
              cx="62"
              cy="104"
              rx="13"
              ry="8"
              fill="#050d03"
              transform="rotate(-20 62 104)"
            />
            {/* Reflection */}
            <ellipse
              cx="56"
              cy="99"
              rx="5"
              ry="3.5"
              fill="rgba(220,255,190,0.65)"
              transform="rotate(-20 62 104)"
            />
            {/* Rim */}
            <ellipse
              cx="62"
              cy="104"
              rx="24"
              ry="15"
              fill="none"
              stroke="rgba(140,255,89,0.5)"
              strokeWidth="1.5"
              transform="rotate(-20 62 104)"
              className="a51-eye"
            />

            {/* Right eye */}
            <ellipse
              cx="128"
              cy="104"
              rx="28"
              ry="19"
              fill="#0b0f08"
              transform="rotate(20 128 104)"
            />
            <ellipse
              cx="128"
              cy="104"
              rx="32"
              ry="22"
              fill="url(#a51-eg)"
              transform="rotate(20 128 104)"
              className="a51-glow-r"
            />
            <ellipse
              cx="128"
              cy="104"
              rx="24"
              ry="15"
              fill="url(#a51-er)"
              transform="rotate(20 128 104)"
              className="a51-eye-r"
            />
            <ellipse
              cx="128"
              cy="104"
              rx="13"
              ry="8"
              fill="#050d03"
              transform="rotate(20 128 104)"
            />
            <ellipse
              cx="122"
              cy="99"
              rx="5"
              ry="3.5"
              fill="rgba(220,255,190,0.65)"
              transform="rotate(20 128 104)"
            />
            <ellipse
              cx="128"
              cy="104"
              rx="24"
              ry="15"
              fill="none"
              stroke="rgba(140,255,89,0.5)"
              strokeWidth="1.5"
              transform="rotate(20 128 104)"
              className="a51-eye-r"
            />

            {/* Nose slits */}
            <ellipse cx="87" cy="148" rx="3.5" ry="5.5" fill="rgba(0,0,0,0.55)" />
            <ellipse cx="103" cy="148" rx="3.5" ry="5.5" fill="rgba(0,0,0,0.55)" />

            {/* Mouth */}
            <path
              d="M 70 172 Q 95 182 120 172"
              stroke="rgba(140,255,89,0.32)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Subtle cranial texture lines */}
            <path
              d="M 58 38 Q 64 72 60 100"
              stroke="rgba(140,255,89,0.055)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M 132 38 Q 126 72 130 100"
              stroke="rgba(140,255,89,0.055)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M 95 20 L 95 68"
              stroke="rgba(140,255,89,0.04)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>

        {/* Brand + dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            className="a51-label"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: "10px",
              letterSpacing: "0.6em",
              color: "#8cff59",
              textTransform: "uppercase",
              paddingLeft: "0.6em" /* optical balance for letter-spacing */,
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
