// Runtime tests for the admin-authentication helpers used by the Edge Function.
import {
  constantTimeEqual,
  isAdminSession,
  verifiedUserEmail,
} from "../supabase/functions/_shared/admin-auth.js";

const ADMIN = "admin@example.com";
const failures = [];
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures.push(name);
}

// A forged token whose (unverified) payload claims the admin email.
const forgedPayload = Buffer.from(JSON.stringify({ email: ADMIN })).toString("base64url");
const forgedToken = `eyJhbGciOiJIUzI1NiJ9.${forgedPayload}.forged-signature`;

check(
  "forged JWT claiming the admin email is rejected when verification fails",
  isAdminSession(forgedToken, { user: null }, { message: "invalid JWT" }, ADMIN) === false,
);
check(
  "forged JWT is rejected even if no auth error is reported but no user came back",
  isAdminSession(forgedToken, { user: null }, null, ADMIN) === false,
);
check(
  "missing bearer token is rejected",
  isAdminSession("", { user: { email: ADMIN } }, null, ADMIN) === false,
);
check(
  "a verified user with another email (any school user) is rejected",
  isAdminSession("tok", { user: { email: "director@school.ml" } }, null, ADMIN) === false,
);
check(
  "an auth error rejects the session even when a user object is present",
  isAdminSession("tok", { user: { email: ADMIN } }, { message: "boom" }, ADMIN) === false,
);
check(
  "the verified admin account is accepted",
  isAdminSession("tok", { user: { email: ADMIN } }, null, ADMIN) === true,
);
check(
  "email comparison ignores case and surrounding spaces",
  isAdminSession("tok", { user: { email: "  Admin@Example.COM " } }, null, ADMIN) === true,
);
check(
  "an empty configured admin email never authorises anyone",
  isAdminSession("tok", { user: { email: "" } }, null, "") === false,
);
check(
  "verifiedUserEmail ignores non-string emails",
  verifiedUserEmail("tok", { user: { email: 42 } }, null) === "",
);

check("constantTimeEqual accepts equal secrets", constantTimeEqual("s3cret", "s3cret") === true);
check("constantTimeEqual trims surrounding spaces", constantTimeEqual(" s3cret", "s3cret ") === true);
check("constantTimeEqual rejects different secrets", constantTimeEqual("s3cret", "s3creT") === false);
check("constantTimeEqual rejects different lengths", constantTimeEqual("s3cret", "s3cret!") === false);
check("constantTimeEqual rejects undefined", constantTimeEqual(undefined, "s3cret") === false);
check("constantTimeEqual never matches two empty values", constantTimeEqual("", "") === false);

if (failures.length > 0) {
  console.error(`\n${failures.length} admin-auth test(s) failed:`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nAll admin-auth tests passed");
