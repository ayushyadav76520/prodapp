import React from "react";

type FocusStudyIllustrationProps = {
  className?: string;
  running?: boolean;
};

export default function FocusStudyIllustration({
  className = "",
  running = true,
}: FocusStudyIllustrationProps) {
  const play = running ? "running" : "paused";

  return (
    <div className={`focus-study-illustration ${className}`} data-running={play}>
      <svg
        viewBox="0 0 800 800"
        width="100%"
        height="100%"
        role="img"
        aria-label="Person studying at a desk under a lamp"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="focusCore" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="#5a5a58" stopOpacity="0.86" />
            <stop offset="44%" stopColor="#3d3d3b" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#171716" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbfaf4" />
            <stop offset="100%" stopColor="#d9d6cc" />
          </linearGradient>

          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>

          <filter id="tinyBlur">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>

          <clipPath id="sceneClip">
            <circle cx="400" cy="400" r="345" />
          </clipPath>
        </defs>

        {/* Base */}
        <rect width="800" height="800" fill="#111110" />
        <circle cx="400" cy="400" r="352" fill="#121212" stroke="#2f2f2d" strokeWidth="6" />

        {/* Soft center glow */}
        <circle
          className="focus-glow"
          cx="400"
          cy="400"
          r="270"
          fill="url(#focusCore)"
          filter="url(#softGlow)"
        />

        {/* Concentric focus rings */}
        <g className="focus-rings" fill="none" stroke="#575754">
          <circle cx="400" cy="400" r="300" strokeWidth="13" opacity=".72" />
          <circle cx="400" cy="400" r="270" strokeWidth="13" opacity=".60" />
          <circle cx="400" cy="400" r="240" strokeWidth="13" opacity=".51" />
          <circle cx="400" cy="400" r="210" strokeWidth="13" opacity=".43" />
          <circle cx="400" cy="400" r="180" strokeWidth="13" opacity=".35" />
        </g>

        <g clipPath="url(#sceneClip)">
          {/* Ambient floating specks */}
          <g className="focus-particles" fill="#cbc8bc">
            <circle cx="188" cy="265" r="4" />
            <circle cx="592" cy="278" r="5" />
            <circle cx="565" cy="232" r="3" />
            <circle cx="235" cy="548" r="3" />
            <circle cx="655" cy="494" r="4" />
            <circle cx="165" cy="448" r="3" />
          </g>

          {/* Floor/desk shadow */}
          <ellipse
            cx="415"
            cy="583"
            rx="255"
            ry="32"
            fill="#0a0a0a"
            opacity=".88"
            className="desk-shadow"
          />

          {/* Lamp */}
          <g className="study-lamp">
            <path
              d="M170 505 C180 430 192 355 218 273"
              fill="none"
              stroke="#2f2f2d"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M207 277 L254 238 L294 260 L264 303 Z"
              fill="#262625"
              stroke="#090909"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              className="lamp-light"
              d="M264 302 L306 368 L206 368 Z"
              fill="#f0eee6"
              opacity=".18"
            />
            <path
              d="M154 521 L207 521"
              fill="none"
              stroke="#343431"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </g>

          {/* Chair */}
          <g className="chair">
            <path
              d="M575 493 C636 470 685 495 682 550 L665 610"
              fill="none"
              stroke="#151515"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M665 610 L660 690"
              fill="none"
              stroke="#272725"
              strokeWidth="16"
              strokeLinecap="round"
            />
          </g>

          {/* Person */}
          <g className="student">
            {/* back/head silhouette */}
            <path
              d="M470 246 C504 213 558 217 581 251 C603 283 591 327 558 343 C536 353 501 350 480 337 C452 319 448 272 470 246 Z"
              fill="#f1efe7"
            />

            {/* hair */}
            <path
              d="M461 274
                 C461 235 489 205 531 206
                 C557 207 584 221 595 251
                 C582 244 573 240 558 242
                 C545 244 533 251 524 262
                 C512 275 494 281 475 279
                 C470 279 465 277 461 274 Z"
              fill="#050505"
            />
            <path
              d="M534 244 C551 230 573 233 589 247"
              fill="none"
              stroke="#050505"
              strokeWidth="9"
              strokeLinecap="round"
            />

            {/* neck */}
            <path
              d="M498 324 L500 356 L552 358 L550 324"
              fill="#ebe9e1"
            />

            {/* torso */}
            <path
              d="M470 344
                 C450 357 423 382 413 430
                 C405 468 421 501 461 517
                 C504 534 553 519 586 484
                 C604 464 616 436 612 409
                 C605 369 578 348 548 342 Z"
              fill="#88857e"
            />

            {/* near shoulder highlight */}
            <path
              d="M470 353 C447 370 431 398 432 432 C433 446 442 452 454 447 C468 440 484 423 495 402"
              fill="#9f9b92"
              opacity=".48"
            />

            {/* far arm */}
            <path
              d="M557 397 C587 407 603 429 606 449 C610 470 598 490 581 497 C568 503 548 493 544 479 L526 433 Z"
              fill="#8f8b84"
            />

            {/* front arm */}
            <path
              d="M510 425 C493 433 475 448 455 460 L397 487 L420 516 L486 488 C515 476 533 459 542 439 Z"
              fill="#9d9991"
            />

            {/* hand */}
            <g className="writing-hand">
              <ellipse cx="405" cy="500" rx="30" ry="18" fill="#eceae2" />
              <path
                d="M392 501 C402 495 414 494 424 500"
                fill="none"
                stroke="#bbb8af"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>

            {/* desk */}
            <path
              d="M184 518 L470 518 L520 550 L155 550 Z"
              fill="#20201f"
              stroke="#080808"
              strokeWidth="7"
              strokeLinejoin="round"
            />

            {/* desk front */}
            <path
              d="M154 550 L522 550 L510 575 L167 575 Z"
              fill="#141414"
            />

            {/* paper */}
            <path
              d="M318 486 L474 486 L506 532 L334 532 Z"
              fill="url(#paper)"
              stroke="#d0cdc3"
              strokeWidth="3"
            />
            <path d="M352 501 L460 501" stroke="#b9b5aa" strokeWidth="3" opacity=".8" />
            <path d="M349 513 L470 513" stroke="#b9b5aa" strokeWidth="3" opacity=".55" />

            {/* pencil */}
            <g className="pencil">
              <rect x="411" y="474" width="11" height="78" rx="5.5" fill="#d99c45" transform="rotate(34 416 513)" />
              <path d="M435 552 L425 561 L428 545 Z" fill="#e1ded4" transform="rotate(34 429 552)" />
              <path d="M431 478 L423 486 L438 491 Z" fill="#2d2d2b" transform="rotate(34 430 484)" />
            </g>

            {/* desk legs */}
            <path d="M201 565 L184 671" stroke="#454541" strokeWidth="13" strokeLinecap="round" />
            <path d="M516 565 L535 671" stroke="#454541" strokeWidth="13" strokeLinecap="round" />

            {/* notebook/center object */}
            <rect x="318" y="457" width="62" height="15" rx="7.5" fill="#464641" opacity=".9" />
          </g>

          {/* Light beam */}
          <path
            className="light-beam"
            d="M259 303 L345 498 L184 498 Z"
            fill="#f4f2ea"
            opacity=".08"
          />
        </g>

        {/* Outer accent ring */}
        <circle
          className="outer-pulse"
          cx="400"
          cy="400"
          r="347"
          fill="none"
          stroke="#77756e"
          strokeWidth="2"
          opacity=".42"
        />
      </svg>

      <style jsx>{`
        .focus-study-illustration {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 28px;
          background: #111110;
        }

        .focus-study-illustration svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .focus-rings {
          transform-origin: 400px 400px;
          animation: ring-breathe 5s ease-in-out infinite;
        }

        .focus-glow {
          animation: glow-breathe 4.8s ease-in-out infinite;
        }

        .student {
          transform-origin: 520px 390px;
          animation: body-breathe 4.2s ease-in-out infinite;
        }

        .writing-hand {
          transform-origin: 405px 500px;
          animation: write-hand 1.7s ease-in-out infinite;
        }

        .pencil {
          transform-origin: 420px 515px;
          animation: pencil-write 1.7s ease-in-out infinite;
        }

        .study-lamp {
          transform-origin: 225px 300px;
          animation: lamp-sway 6s ease-in-out infinite;
        }

        .lamp-light {
          animation: lamp-glow 3.2s ease-in-out infinite;
        }

        .desk-shadow {
          transform-origin: 415px 583px;
          animation: shadow-breathe 4.2s ease-in-out infinite;
        }

        .focus-particles circle:nth-child(1) { animation: particle-a 4.5s ease-in-out infinite; }
        .focus-particles circle:nth-child(2) { animation: particle-b 5.2s ease-in-out infinite; }
        .focus-particles circle:nth-child(3) { animation: particle-c 3.9s ease-in-out infinite; }
        .focus-particles circle:nth-child(4) { animation: particle-b 6.1s ease-in-out infinite reverse; }
        .focus-particles circle:nth-child(5) { animation: particle-a 5.7s ease-in-out infinite reverse; }
        .focus-particles circle:nth-child(6) { animation: particle-c 4.8s ease-in-out infinite reverse; }

        .outer-pulse {
          animation: outer-pulse 6s ease-in-out infinite;
        }

        .focus-study-illustration[data-running="paused"] * {
          animation-play-state: paused !important;
        }

        @keyframes ring-breathe {
          0%, 100% { transform: scale(1); opacity: .92; }
          50% { transform: scale(1.025); opacity: 1; }
        }

        @keyframes glow-breathe {
          0%, 100% { opacity: .28; transform: scale(1); }
          50% { opacity: .46; transform: scale(1.035); }
        }

        @keyframes body-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes write-hand {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          22% { transform: translate(3px, -1px) rotate(-1deg); }
          47% { transform: translate(8px, 1px) rotate(1deg); }
          70% { transform: translate(3px, 0) rotate(-1deg); }
        }

        @keyframes pencil-write {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          22% { transform: translate(2px, -2px) rotate(-1deg); }
          47% { transform: translate(8px, 2px) rotate(1deg); }
          70% { transform: translate(1px, 0) rotate(-1deg); }
        }

        @keyframes lamp-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-1.4deg); }
        }

        @keyframes lamp-glow {
          0%, 100% { opacity: .14; }
          50% { opacity: .25; }
        }

        @keyframes shadow-breathe {
          0%, 100% { transform: scaleX(1); opacity: .88; }
          50% { transform: scaleX(.97); opacity: .76; }
        }

        @keyframes particle-a {
          0%, 100% { transform: translate(0, 0); opacity: .35; }
          50% { transform: translate(6px, -10px); opacity: .85; }
        }

        @keyframes particle-b {
          0%, 100% { transform: translate(0, 0); opacity: .28; }
          50% { transform: translate(-8px, 7px); opacity: .72; }
        }

        @keyframes particle-c {
          0%, 100% { transform: translate(0, 0); opacity: .3; }
          50% { transform: translate(4px, 9px); opacity: .7; }
        }

        @keyframes outer-pulse {
          0%, 100% { opacity: .28; }
          50% { opacity: .52; }
        }

        @media (prefers-reduced-motion: reduce) {
          .focus-study-illustration *,
          .focus-study-illustration *::before,
          .focus-study-illustration *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
