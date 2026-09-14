/** Clean seeker-facing answers — no tech markers, no WhatsApp `1` hints. */
export function polishSeekerAnswer(text: string): string {
  return String(text || "")
    .replace(/【([^】]*)】/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`1`\s*दाबून/g, "बटण दाबून")
    .replace(/`1`/g, "«मधुसुदनदास विजयानंद यांच्याकडे पाठवा»")
    .replace(/\b1\s*दाबून/g, "बटण दाबून")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function needsAnswerPolish(text: string | null | undefined): boolean {
  if (!text) return false;
  return /【|】|^#{1,6}\s|`1`|\b1\s*दाबून/m.test(text);
}
