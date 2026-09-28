import { LANDMARKS, PLAZA, ROAD_VISUAL_D, ROWS } from "../roadPath";

function Checkers({ x, y, cols, rows, size }: { x: number; y: number; cols: number; rows: number; size: number }) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <rect key={`${r}-${c}`} x={x + c * size} y={y + r * size} width={size} height={size} fill={(r + c) % 2 === 0 ? "#15171c" : "#f6f3ea"} />,
      );
    }
  }
  return <g>{cells}</g>;
}

function Crosswalk({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={x - 18} y={y - 27 + i * 9.4} width={36} height={5} rx={1} fill="#f5f2ea" opacity={0.92} />
      ))}
    </g>
  );
}

function Bridge() {
  const x = LANDMARKS.bridgeX;
  const top = ROWS.middle - 36;
  const bottom = ROWS.middle + 30;
  return (
    <g>
      <rect x={x - 52} y={bottom + 8} width={104} height={10} fill="#0e4f6e" opacity={0.35} />
      {[top, bottom].map((ry) => (
        <g key={ry}>
          <rect x={x - 56} y={ry} width={112} height={7} rx={2} fill="#e9e3d3" stroke="#a79f8a" strokeWidth={1} />
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={x - 54 + i * 15.4} y={ry - 3} width={4} height={10} rx={1} fill="#c9c1ac" />
          ))}
        </g>
      ))}
    </g>
  );
}

function StartGrid() {
  const x = LANDMARKS.startX;
  const y = ROWS.bottom;
  return (
    <g>
      <Checkers x={x - 8} y={y - 29} cols={2} rows={6} size={9.7} />
      {[
        [x - 44, y - 14],
        [x - 44, y + 14],
        [x - 90, y - 14],
        [x - 90, y + 14],
      ].map(([gx, gy], i) => (
        <path key={i} d={`M ${gx} ${gy - 11} h -18 v 22 h 18`} stroke="#f5f2ea" strokeWidth={2.5} fill="none" opacity={0.85} />
      ))}
    </g>
  );
}

function FinishLine() {
  const x = LANDMARKS.finishX;
  const y = ROWS.top;
  return (
    <g>
      <Checkers x={x - 8} y={y - 29} cols={2} rows={6} size={9.7} />
      {/* overhead arch: pylons + checkered beam, offset shadow shows height */}
      <rect x={x - 10} y={y - 48} width={22} height={100} fill="#000" opacity={0.25} transform="translate(10 14)" />
      <rect x={x - 12} y={y - 52} width={24} height={16} rx={3} fill="#c9312a" />
      <rect x={x - 12} y={y + 38} width={24} height={16} rx={3} fill="#c9312a" />
      <rect x={x - 7} y={y - 44} width={14} height={90} fill="#f6f3ea" />
      <Checkers x={x - 7} y={y - 44} cols={2} rows={13} size={7} />
    </g>
  );
}

function Plaza() {
  const { x, y, r } = PLAZA;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 8} fill="#2f4a22" opacity={0.22} />
      <circle cx={x} cy={y} r={r + 3} fill="#e2dccd" />
      <circle cx={x} cy={y} r={r} fill="#f5f2ea" />
      <circle cx={x} cy={y} r={r - 4} fill="#3d4049" />
      <circle cx={x} cy={y} r={r - 12} fill="none" stroke="#e6bf5c" strokeWidth={2} strokeDasharray="6 5" />
      {/* podium */}
      <rect x={x - 21} y={y - 6} width={14} height={14} fill="#c9ced6" />
      <rect x={x - 7} y={y - 14} width={14} height={22} fill="#e6bf5c" />
      <rect x={x + 7} y={y - 1} width={14} height={9} fill="#c98a4a" />
      <text x={x} y={y + 5} textAnchor="middle" fontFamily="var(--font-display)" fontSize={12} fill="#5a3d08">
        1
      </text>
    </g>
  );
}

export function Road() {
  return (
    <g>
      <path d={ROAD_VISUAL_D} stroke="#2f4a22" strokeWidth={86} fill="none" opacity={0.2} strokeLinejoin="round" />
      <path d={ROAD_VISUAL_D} stroke="#e2dccd" strokeWidth={74} fill="none" strokeLinejoin="round" />
      <path d={ROAD_VISUAL_D} stroke="#f5f2ea" strokeWidth={66} fill="none" strokeLinejoin="round" />
      <path d={ROAD_VISUAL_D} stroke="#3d4049" strokeWidth={58} fill="none" strokeLinejoin="round" />
      <path
        d={ROAD_VISUAL_D}
        stroke="url(#paperNoise)"
        strokeWidth={58}
        fill="none"
        strokeLinejoin="round"
        opacity={0.5}
        style={{ mixBlendMode: "overlay" }}
      />
      <path d={ROAD_VISUAL_D} stroke="#f5f2ea" strokeWidth={3} fill="none" strokeDasharray="20 16" opacity={0.9} />
      <Plaza />
      <StartGrid />
      <FinishLine />
      <Crosswalk x={835} y={ROWS.middle} />
      <Crosswalk x={1180} y={ROWS.middle} />
      <Bridge />
    </g>
  );
}

/** Mountain that the road tunnels through — drawn above the road. */
export function TunnelMountain() {
  const { from, to } = LANDMARKS.tunnel;
  const y = ROWS.top;
  return (
    <g>
      <path
        d={`M ${from - 6} ${y + 46} C ${from + 10} ${y - 20} ${from + 40} ${y - 130} 588 ${y - 162} C 640 ${y - 130} ${to - 20} ${y - 30} ${to + 10} ${y + 46} Z`}
        fill="#000"
        opacity={0.2}
        transform="translate(10 8)"
      />
      <path
        d={`M ${from - 6} ${y + 46} C ${from + 10} ${y - 20} ${from + 40} ${y - 130} 588 ${y - 162} C 640 ${y - 130} ${to - 20} ${y - 30} ${to + 10} ${y + 46} Z`}
        fill="#8d877f"
      />
      <path
        d={`M 588 ${y - 162} C 640 ${y - 130} ${to - 20} ${y - 30} ${to + 10} ${y + 46} L 600 ${y + 46} C 610 ${y - 20} 600 ${y - 100} 588 ${y - 162} Z`}
        fill="#6e6962"
      />
      <path d={`M 588 ${y - 162} C 602 ${y - 150} 614 ${y - 138} 622 ${y - 126} L 604 ${y - 132} L 590 ${y - 118} L 576 ${y - 130} L 560 ${y - 128} C 568 ${y - 142} 578 ${y - 154} 588 ${y - 162} Z`} fill="#f4f7fb" />
      {/* grassy foot */}
      <path d={`M ${from - 6} ${y + 46} C ${from + 60} ${y + 24} ${to - 60} ${y + 24} ${to + 10} ${y + 46} Z`} fill="#7aa85a" />
      {/* portals */}
      {[from + 8, to - 8].map((px) => (
        <g key={px}>
          <rect x={px - 13} y={y - 36} width={26} height={72} rx={6} fill="#b9b0a0" stroke="#8f8676" strokeWidth={2} />
          <rect x={px - 7} y={y - 28} width={14} height={56} rx={5} fill="#15161a" />
        </g>
      ))}
    </g>
  );
}
