require("dotenv").config();
const app = require("./src/app");

// A missing, short or example-value JWT secret means anyone who knows it can
// sign a valid login token for any user. In production the server refuses to
// start; in development it starts but warns every time. The secret itself is
// never printed.
const EXAMPLE_SECRET = "replace-this-with-a-long-random-string";
const secret = process.env.JWT_SECRET || "";
if (secret.length < 32 || secret === EXAMPLE_SECRET) {
  const problem =
    "JWT_SECRET is missing, shorter than 32 characters, or still the example value.";
  const fix =
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"";
  if (process.env.NODE_ENV === "production") {
    console.error(`${problem} Refusing to start in production. ${fix}`);
    process.exit(1);
  }
  console.warn(`WARNING: ${problem} Anyone who knows it can forge logins. ${fix}`);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Forevia API server running on port ${PORT}`);
});

