/**
 * Vale brand landscape — city on the left balancing fields on the right,
 * joined by the road every shipment travels. Flat two-tone illustration
 * in the brand palette, inline so no asset pipeline is needed.
 *
 * Animated: a lorry drives out and back along the road, a second van runs the
 * opposite lane, the lane markers stream, and the wind turbine spins. All
 * motion is CSS-only and suppressed under prefers-reduced-motion.
 */
export function ValeLandscape({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 460"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Illustration of a city skyline on the left and rural fields on the right, joined by a road"
    >
      <defs>
        <linearGradient id="vale-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7e8d0" />
          <stop offset="0.55" stopColor="#f3c98a" />
          <stop offset="1" stopColor="#e8a34a" />
        </linearGradient>
        <style>{`
          .vale-blades { transform-origin: 1290px 296px; animation: vale-spin 7s linear infinite; }
          .vale-blades-2 { transform-origin: 1170px 316px; animation: vale-spin 8.4s linear infinite; }
          .vale-lane { stroke-dasharray: 26 20; animation: vale-road 1.6s linear infinite; }
          @keyframes vale-spin { to { transform: rotate(360deg); } }
          @keyframes vale-road { to { stroke-dashoffset: -46; } }
          @media (prefers-reduced-motion: reduce) {
            .vale-blades, .vale-blades-2, .vale-lane { animation: none; }
          }
        `}</style>
      </defs>

      <rect x="0" y="0" width="1440" height="460" fill="url(#vale-sky)" />
      <circle cx="980" cy="120" r="54" fill="#fff3dc" />

      {/* City side — left */}
      <g fill="#183b2a">
        <rect x="0" y="170" width="70" height="290" />
        <rect x="80" y="120" width="56" height="340" />
        <rect x="94" y="96" width="28" height="24" />
        <rect x="150" y="190" width="64" height="270" />
        <rect x="228" y="150" width="60" height="310" />
        <rect x="300" y="210" width="48" height="250" />
      </g>
      <g fill="#0f2a1d">
        <rect x="24" y="196" width="12" height="12" />
        <rect x="24" y="226" width="12" height="12" />
        <rect x="96" y="140" width="10" height="10" />
        <rect x="116" y="140" width="10" height="10" />
        <rect x="96" y="170" width="10" height="10" />
        <rect x="244" y="170" width="12" height="12" />
        <rect x="244" y="200" width="12" height="12" />
      </g>
      {/* cranes */}
      <g stroke="#183b2a" strokeWidth="8" fill="none">
        <path d="M360 460 V120 H430" />
        <path d="M360 160 H415" />
      </g>
      <line x1="415" y1="160" x2="415" y2="210" stroke="#183b2a" strokeWidth="4" />

      {/* Rural side — right */}
      <path d="M1440 260 C1240 210 1060 250 900 300 C760 344 640 330 560 300 L560 460 L1440 460 Z" fill="#2f6b43" />
      <path d="M1440 330 C1260 300 1090 330 960 360 C860 380 740 376 660 360 L660 460 L1440 460 Z" fill="#265739" />
      <path d="M1440 395 C1290 372 1120 392 1010 410 C950 417 880 416 830 410 L830 460 L1440 460 Z" fill="#1d4a2f" />
      {/* field rows */}
      <g stroke="#3c7a4e" strokeWidth="3" fill="none" opacity="0.7">
        <path d="M980 460 C1060 400 1180 372 1320 360" />
        <path d="M1020 460 C1100 410 1200 386 1340 376" />
      </g>
      {/* wind turbine — animated blades */}
      <path d="M1290 392 V296" stroke="#f7f8f6" strokeWidth="6" fill="none" />
      <g className="vale-blades" stroke="#f7f8f6" strokeWidth="6" fill="none">
        <path d="M1290 296 L1290 250 M1290 296 L1242 316 M1290 296 L1338 316 M1290 296 L1290 268" />
      </g>
      {/* second, smaller turbine spinning at its own speed */}
      <path d="M1170 400 V316" stroke="#f7f8f6" strokeWidth="5" fill="none" />
      <g className="vale-blades-2" stroke="#f7f8f6" strokeWidth="5" fill="none">
        <path d="M1170 316 L1170 282 M1170 316 L1140 330 M1170 316 L1200 330 M1170 316 L1170 290" />
      </g>
      {/* trees */}
      <g fill="#183b2a">
        <circle cx="720" cy="300" r="26" />
        <rect x="714" y="316" width="12" height="26" />
        <circle cx="780" cy="318" r="18" />
        <rect x="775" y="330" width="10" height="20" />
      </g>

      {/* Road through the middle */}
      <path d="M520 460 C600 400 700 380 830 376 C1020 371 1220 400 1450 452 L1450 460 Z" fill="#33403a" />
      <path className="vale-lane" d="M540 452 C640 402 760 392 900 390 C1060 388 1240 414 1420 452" stroke="#f3c98a" strokeWidth="5" fill="none" />

      {/* Two lorries cruising the outbound lane, spaced by traffic timing */}
      <g>
        <g transform="translate(-70,-28)">
          <rect x="0" y="0" width="96" height="40" rx="4" fill="#f7f8f6" />
          <path d="M96 10 h26 l18 18 v12 h-44 z" fill="#d97706" />
          <circle cx="24" cy="46" r="9" fill="#171a18" />
          <circle cx="118" cy="46" r="9" fill="#171a18" />
        </g>
        <animateMotion dur="24s" repeatCount="indefinite"
          path="M500 452 C620 408 760 396 900 394 C1080 392 1260 418 1460 455" />
      </g>
      <g>
        <g transform="translate(-70,-28)">
          <rect x="0" y="0" width="96" height="40" rx="4" fill="#f7f8f6" />
          <path d="M96 10 h26 l18 18 v12 h-44 z" fill="#2f6b43" />
          <circle cx="24" cy="46" r="9" fill="#171a18" />
          <circle cx="118" cy="46" r="9" fill="#171a18" />
        </g>
        <animateMotion dur="24s" begin="-12s" repeatCount="indefinite"
          path="M500 452 C620 408 760 396 900 394 C1080 392 1260 418 1460 455" />
      </g>

      {/* A van returning on the opposite lane, facing the other way */}
      {/* <g>
        <g transform="translate(-53,-24) scale(-0.9,0.9)">
          <rect x="0" y="0" width="72" height="34" rx="6" fill="#f7f8f6" />
          <path d="M72 10 h20 l14 14 v10 h-34 z" fill="#265739" />
          <circle cx="18" cy="40" r="8" fill="#171a18" />
          <circle cx="88" cy="40" r="8" fill="#171a18" />
        </g>
        <animateMotion dur="19s" repeatCount="indefinite"
          path="M1470 428 C1260 400 1050 382 880 380 C700 378 590 396 520 432" />
      </g> */}
    </svg>
  );
}
