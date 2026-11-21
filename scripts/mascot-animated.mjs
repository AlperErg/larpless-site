// Writes public/mascot-animated.svg (npm run mascot): the eye holes are subpaths of the body, animated by morphing `d`.
import { writeFileSync } from 'node:fs';

const OUTLINE =
  'M300,170 H724 A190,190 0 0 1 914,360 V570 A190,190 0 0 1 724,760 H300 A190,190 0 0 1 110,570 V360 A190,190 0 0 1 300,170 Z M432,700 H592 V850 H432 Z M352,812 H672 A40,40 0 0 1 672,892 H352 A40,40 0 0 1 352,812 Z';
const EYES = [430, 594]; // centre x of each eye looking at you
const CY = 450;

const n = (v) => +v.toFixed(2);
// A rounded rect wound counter-clockwise so it cuts a hole under the nonzero rule. Same commands for
// every pose, so SMIL can interpolate between them.
function eye(cx, open) {
  const w = open ? 96 : 112;
  const h = open ? 200 : 28;
  const r = Math.min(w, h) / 2;
  const x = cx - w / 2, y = CY - h / 2;
  return `M${n(x + w - r)},${n(y)} H${n(x + r)} A${n(r)},${n(r)} 0 0 0 ${n(x)},${n(y + r)} V${n(y + h - r)} A${n(r)},${n(r)} 0 0 0 ${n(x + r)},${n(y + h)} H${n(x + w - r)} A${n(r)},${n(r)} 0 0 0 ${n(x + w)},${n(y + h - r)} V${n(y + r)} A${n(r)},${n(r)} 0 0 0 ${n(x + w - r)},${n(y)} Z`;
}
const pose = (dx, open) => `${OUTLINE} ${EYES.map((cx) => eye(cx + dx, open)).join(' ')}`;

const L = -176, R = 176; // R is the icon's pose
// [time 0..1, x offset, eyes open]
const frames = [
  [0, 0, true],
  [0.07, 0, true], [0.085, 0, false], [0.1, 0, true],
  [0.15, 0, true], [0.2, L, true],
  [0.36, L, true], [0.41, 0, true],
  [0.49, 0, true], [0.505, 0, false], [0.52, 0, true],
  [0.55, 0, true], [0.6, R, true],
  [0.8, R, true], [0.85, 0, true],
  [1, 0, true],
];
const DUR = '10s';
const values = frames.map(([, dx, open]) => pose(dx, open)).join(';\n      ');
const keyTimes = frames.map(([t]) => t).join(';');
const keySplines = frames.slice(1).map(() => '0.42 0 0.58 1').join(';');
const animate = `<animate attributeName="d" dur="${DUR}" repeatCount="indefinite" calcMode="spline"
      keyTimes="${keyTimes}"
      keySplines="${keySplines}"
      values="${values}"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="110 170 804 764" width="804" height="764">
  <!-- The hero mascot (mascot.svg) looping: it looks at you and blinks, glances left, looks back and blinks,
       glances right into the icon's pose, then looks back. It only blinks looking at you. The eyes are holes in the body
       and in the slab under it, so the slab's lip shows at the top of each eye; both paths morph their \`d\`
       with SMIL rather than moving shapes in a mask, which browsers repaint unreliably in an <img>.
       Written by scripts/mascot-animated.mjs (npm run mascot): edit the poses there. The page swaps in mascot.svg for
       reduced motion. -->
  <defs><linearGradient id="body-fill" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#5BC98F"/><stop offset="1" stop-color="#2E9A69"/></linearGradient></defs>
  <path transform="translate(0 42)" fill="#1F6B4B" d="${pose(0, true)}">
    ${animate}
  </path>
  <path fill="url(#body-fill)" d="${pose(0, true)}">
    ${animate}
  </path>
  <path d="M250,300 A150,150 0 0 1 380,232" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="38" stroke-linecap="round"/>
</svg>
`;
writeFileSync(new URL('../public/mascot-animated.svg', import.meta.url), svg);
