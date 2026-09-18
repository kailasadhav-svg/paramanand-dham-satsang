/** Login / member-login couplet — no phones. Exact text as given. */
export const AUTH_COUPLET =
  "हंस सोहं अजपा ध्यान असो साधका | नीरक्षीर हंस तू परमानंद चरणसेवका ..!- मधुसूदनदास विजयानंद";

export function AuthCoupletFooter() {
  const pipe = AUTH_COUPLET.indexOf("|");
  const first = AUTH_COUPLET.slice(0, pipe + 1);
  const rest = AUTH_COUPLET.slice(pipe + 1).trimStart();

  return (
    <p
      className="mt-auto px-1 pt-8 text-center font-kalam text-[0.95rem] leading-[1.75] text-temple-muted sm:text-lg"
      lang="mr"
    >
      {first}{" "}
      <span className="block sm:inline">{rest}</span>
    </p>
  );
}
