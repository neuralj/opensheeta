import { t as analyzeHealth } from "../../../../chunks/health.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/health/+server.ts
var GET = async () => {
	return json(analyzeHealth());
};
//#endregion
export { GET };
