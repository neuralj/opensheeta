import { t as analyzeArchitecture } from "../../../../chunks/architecture.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/architecture/+server.ts
var GET = async () => {
	return json(analyzeArchitecture());
};
//#endregion
export { GET };
