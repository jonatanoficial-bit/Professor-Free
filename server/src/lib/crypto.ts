import crypto from "node:crypto";

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(16)}_${crypto.randomBytes(8).toString("hex")}`;
}

export function scryptHash(password: string, saltHex?: string) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64) as Buffer;
  return { saltHex: salt.toString("hex"), hashHex: hash.toString("hex") };
}

export function safeEqualHex(a: string, b: string) {
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}