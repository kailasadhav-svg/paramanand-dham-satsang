/**
 * Detect when a stored literature answer clearly doesn't match the question
 * (e.g. आरती asked → अजपा जप template recycled).
 */
export function literatureLooksMismatched(
  question: string,
  answer: string | null | undefined,
): boolean {
  if (!answer?.trim()) return false;
  const q = question.normalize("NFC");
  const a = answer.normalize("NFC");

  const asksAarti = /आरती|आरति|aarti|arti/i.test(q);
  const answerHasAarti =
    /आरती परमानंद|आरती परमानंदा|【\s*आरती/i.test(a) ||
    (/आरती/.test(a) && /धृ|ध्रुव|कडव|अर्थ/.test(a));
  const answerIsAjapaTemplate =
    /【\s*अजपा\s*जप\s*】/.test(a) ||
    /अजपा म्हणजे श्वास/.test(a) ||
    (/अजपा जप/.test(a) && /निरंतर नामस्मरण|श्वास घेताना|श्वासासोबत/.test(a));

  if (asksAarti && answerIsAjapaTemplate && !answerHasAarti) return true;

  const asksAjapa = /अजपा|ajapa/i.test(q) && !asksAarti;
  if (asksAjapa && answerHasAarti && !/अजपा/.test(a)) return true;

  return false;
}
