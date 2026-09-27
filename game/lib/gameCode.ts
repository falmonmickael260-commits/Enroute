const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateGameCode(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `ENR-${suffix}`;
}
