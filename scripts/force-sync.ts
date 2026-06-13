import { loadLocalEnv } from "./load-local-env";
import { forceSyncMatches } from "../src/lib/prode/sync";

loadLocalEnv();

async function main() {
  const result = await forceSyncMatches();
  console.log(JSON.stringify(result, null, 2));
  if (result.error) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
