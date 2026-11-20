// Static guard on the scolaria-admin Edge Function source.
//
// This is a SOURCE-LEVEL check, not a runtime test: it asserts that the admin
// authentication never trusts an unverified JWT payload and relies on the shared,
// unit-tested helper. Runtime behaviour of that helper is covered separately.
import { readFileSync } from "node:fs";

const src = readFileSync(
  new URL("../supabase/functions/scolaria-admin/index.ts", import.meta.url),
  "utf8",
);

const failures = [];
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures.push(name);
}

check(
  "admin access never decodes or trusts an unverified JWT payload (no atob / tokenEmail fallback)",
  !/atob\s*\(/.test(src) && !/tokenEmail/.test(src),
);
check(
  "admin access is granted only through the shared isAdminSession() helper",
  /isAdminSession\s*\(/.test(src),
);
check(
  "developer code is compared with constantTimeEqual()",
  /constantTimeEqual\s*\(/.test(src),
);

if (failures.length > 0) {
  console.error(`\n${failures.length} Edge Function auth check(s) failed:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nAll Edge Function auth checks passed");
