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
  // Ignore echoed question lines so «आरती …» in the prompt doesn't count as aarti body.
  const a = answer
    .normalize("NFC")
    .replace(/आपल्या प्रश्नाबाबत\s*\([^)]*\)/g, "")
    .replace(/«[^»]*»/g, "")
    .replace(/"[^"]*"/g, "");

  const asksAarti = /आरती|आरति|aarti|arti/i.test(q);
  const answerHasAarti =
    /आरती परमानंदा|॥\s*आरती|ध्रुवपद|कडव/i.test(a) ||
    (/आरती/.test(a) && /धृ|अर्थ|परमहंस देवा|माझ्या अंतरीच्या/.test(a));
  const answerIsAjapaTemplate =
    /【\s*अजपा\s*जप\s*】/.test(a) ||
    /अजपा म्हणजे श्वास/.test(a) ||
    (/अजपा जप/.test(a) && /निरंतर नामस्मरण|श्वास घेताना|श्वासासोबत/.test(a));

  if (asksAarti && answerIsAjapaTemplate && !answerHasAarti) return true;

  if (
    asksAarti &&
    !answerHasAarti &&
    (/अजपा व सत्संग परंपरेनुसार|【\s*अजपा|टेम्प्लेट कॉपी|`1`\s*दाब/.test(a) ||
      /AI\s*उत्तर|एआय\s*उत्तर/i.test(a))
  ) {
    return true;
  }

  const asksAjapa = /अजपा|ajapa/i.test(q) && !asksAarti;
  if (asksAjapa && answerHasAarti && !/अजपा/.test(a)) return true;

  return false;
}

/** Answer still looks like a system/tech dump rather than literature. */
export function literatureLooksTechy(answer: string | null | undefined): boolean {
  if (!answer?.trim()) return false;
  const a = answer;
  return (
    /【[^】]+】/.test(a) ||
    /`1`/.test(a) ||
    /टेम्प्लेट कॉपी|संदर्भ मजकूर \(संक्षेप\)|संदर्भ साहित्य \(संक्षेप\)/.test(a) ||
    /\bAI\b|एआय उत्तर|AI उत्तर/i.test(a) ||
    /^##\s+/m.test(a)
  );
}
