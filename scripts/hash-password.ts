/**
 * Prints a password hash for the ADMIN_PASSWORD_HASH environment variable.
 * Usage: npm run admin:hash -- "my strong password"
 */
import { hashPassword } from "../src/server/auth/password";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: npm run admin:hash -- \"<password of at least 12 characters>\"");
  process.exit(1);
}

hashPassword(password).then((hash) => console.log(hash));
