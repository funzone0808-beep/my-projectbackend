const bcrypt = require("bcryptjs");

async function main() {
  const plainPassword = process.argv[2];

  if (!plainPassword) {
    console.log("Usage: node scripts/hash-password.js yourpassword");
    process.exit(1);
  }

  const saltRounds = 10;
  const hash = await bcrypt.hash(plainPassword, saltRounds);

  console.log(hash);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});