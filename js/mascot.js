// Mascote original em pixel-art (SVG), laranja com guitarra. Sem imagens externas.
export function mascotSVG() {
  const o = '#ff7a1a', d = '#b8420a', k = '#1a0d2e', w = '#fff', r = '#e0243a', n = '#f1d6a8';
  const px = (x, y, w2, h, c) => `<rect x="${x}" y="${y}" width="${w2}" height="${h}" fill="${c}"/>`;
  return `<svg class="mascot" viewBox="0 0 16 18" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${px(4,1,7,1,k)}${px(3,2,9,1,k)}${px(2,3,11,6,k)}${px(3,9,9,1,k)}
  ${px(4,2,7,1,o)}${px(3,3,9,6,o)}${px(4,9,7,1,d)}
  ${px(5,4,2,3,k)}${px(9,4,2,3,k)}${px(5,4,1,1,w)}${px(9,4,1,1,w)}
  ${px(6,8,4,1,k)}
  ${px(4,10,8,4,o)}${px(4,13,8,1,d)}${px(4,14,2,3,o)}${px(10,14,2,3,o)}${px(3,17,3,1,k)}${px(10,17,3,1,k)}
  ${px(1,9,4,2,o)}${px(11,10,3,2,o)}
  ${px(0,8,2,1,k)}
  ${px(2,11,12,2,n)}${px(1,10,3,3,r)}${px(12,9,3,2,d)}${px(14,6,1,4,n)}
  </svg>`;
}
