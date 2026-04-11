require("dotenv").config({ path: ".env" });

const { createClient } = require("@supabase/supabase-js");

const REQUIRED_COLUMNS = [
  "payment_status",
  "billing_status",
  "bill_number",
  "billed_at",
  "paid_at"
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log("Billing schema check skipped: missing Supabase environment values.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const selectColumns = ["id", ...REQUIRED_COLUMNS].join(",");
  const { error } = await supabase
    .from("orders")
    .select(selectColumns)
    .limit(1);

  if (error) {
    console.log("Billing schema is not ready yet.");
    console.log(`${error.code || "UNKNOWN"} ${error.message || ""}`.trim());
    console.log("Apply scripts/add-order-billing-metadata-columns.sql when you are ready.");
    process.exit(1);
  }

  console.log("Billing schema looks ready.");
  console.log(`Columns: ${REQUIRED_COLUMNS.join(", ")}`);
}

main().catch((error) => {
  console.error(`Billing schema check failed: ${error.message}`);
  process.exit(1);
});
