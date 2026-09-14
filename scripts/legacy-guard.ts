import { processInboundMessage } from "../lib/ajapa/bot";

async function main() {
  const hi = await processInboundMessage({ from: "919999999999", text: "hi" });
  const one = await processInboundMessage({ from: "919999999999", text: "1" });
  const soham = await processInboundMessage({ from: "919999999999", text: "SOHAM" });
  console.log(JSON.stringify({ hi, one, sohamHandled: soham.handled }));
  if (hi.handled || one.handled) throw new Error("legacy traffic was stolen");
  if (!soham.handled) throw new Error("SOHAM should be handled");
  console.log("LEGACY_GUARD_OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
