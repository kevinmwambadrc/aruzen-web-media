// Encodeur Adobe Swatch Exchange (.ase) : nuanciers ouvrables dans Illustrator, Photoshop et InDesign.
// groups = [{ name, colors: [{ name, rgb: [r, g, b] }] }]
function utf16(s) {
  const v = new DataView(new ArrayBuffer(2 + (s.length + 1) * 2));
  v.setUint16(0, s.length + 1);
  for (let i = 0; i < s.length; i++) v.setUint16(2 + i * 2, s.charCodeAt(i));
  return new Uint8Array(v.buffer);
}

function block(type, body) {
  const head = new DataView(new ArrayBuffer(6));
  head.setUint16(0, type);
  head.setUint32(2, body.length);
  return [new Uint8Array(head.buffer), body];
}

export function encodeAse(groups) {
  const parts = [];
  let count = 0;
  for (const g of groups) {
    parts.push(...block(0xc001, utf16(g.name)));
    count++;
    for (const c of g.colors) {
      const tail = new DataView(new ArrayBuffer(18));
      "RGB ".split("").forEach((ch, i) => tail.setUint8(i, ch.charCodeAt(0)));
      c.rgb.forEach((v, i) => tail.setFloat32(4 + i * 4, v / 255));
      tail.setUint16(16, 2); // couleur globale « normale »
      const name = utf16(c.name);
      const body = new Uint8Array(name.length + 18);
      body.set(name);
      body.set(new Uint8Array(tail.buffer), name.length);
      parts.push(...block(0x0001, body));
      count++;
    }
    parts.push(...block(0xc002, new Uint8Array(0)));
    count++;
  }
  const head = new DataView(new ArrayBuffer(12));
  "ASEF".split("").forEach((ch, i) => head.setUint8(i, ch.charCodeAt(0)));
  head.setUint16(4, 1);
  head.setUint16(6, 0);
  head.setUint32(8, count);
  return new Blob([new Uint8Array(head.buffer), ...parts], { type: "application/octet-stream" });
}
