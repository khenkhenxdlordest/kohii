// Walang 0/O at 1/l/I para madaling basahin at ibigay sa staff
const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Random na pansamantalang password, hal. "kH7mQ2pA" */
export function generateTempPassword(length = 8) {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join('');
}
