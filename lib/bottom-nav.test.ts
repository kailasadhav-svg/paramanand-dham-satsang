import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CHINTAN_LABEL } from "./labels.ts";
import { visibleBottomNavItems } from "./bottom-nav.ts";

function hrefs(role: Parameters<typeof visibleBottomNavItems>[0]) {
  return visibleBottomNavItems(role).map((i) => i.href);
}

describe("visibleBottomNavItems", () => {
  it("gives मार्गदर्शक चिंतन and hides प्रश्न", () => {
    const items = visibleBottomNavItems("guru");
    assert.deepEqual(hrefs("guru"), [
      "/attendance",
      "/topic",
      "/weekly",
      "/ajapa",
      "/report",
    ]);
    assert.equal(
      items.find((i) => i.href === "/weekly")?.label,
      CHINTAN_LABEL,
    );
    assert.equal(CHINTAN_LABEL, "चिंतन");
    assert.equal(
      items.some((i) => i.href === "/questions" || i.label === "प्रश्न"),
      false,
    );
  });

  it("keeps प्रश्न for संगणक and परमानंद चरणसेवक", () => {
    assert.deepEqual(hrefs("software"), [
      "/attendance",
      "/topic",
      "/questions",
      "/ajapa",
      "/report",
    ]);
    assert.deepEqual(hrefs("charansevak"), [
      "/attendance",
      "/topic",
      "/questions",
      "/ajapa",
    ]);
    assert.equal(hrefs("software").includes("/weekly"), false);
    assert.equal(hrefs("charansevak").includes("/weekly"), false);
    assert.equal(hrefs("software").includes("/questions"), true);
    assert.equal(hrefs("charansevak").includes("/questions"), true);
  });

  it("hides अहवाल until a staff role is bound", () => {
    assert.deepEqual(hrefs(null), [
      "/attendance",
      "/topic",
      "/questions",
      "/ajapa",
    ]);
  });
});

describe("BottomNav wiring", () => {
  it("renders from visibleBottomNavItems and labels चिंतन", () => {
    const nav = readFileSync(new URL("../components/BottomNav.tsx", import.meta.url), "utf8");
    assert.match(nav, /visibleBottomNavItems/);
    assert.match(nav, /\/weekly/);
    assert.equal(nav.includes('label: "टिपणी"'), false);
    const attendance = readFileSync(
      new URL("../app/(app)/attendance/page.tsx", import.meta.url),
      "utf8",
    );
    assert.equal(
      attendance.includes('href="/questions"'),
      false,
      "मार्गदर्शक attendance shortcuts must not open प्रश्न",
    );
  });
});
