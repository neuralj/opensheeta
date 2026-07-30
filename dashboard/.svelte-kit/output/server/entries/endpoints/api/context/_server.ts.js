import { t as getContextSnapshot } from "../../../../chunks/state.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/context/+server.ts
var GET = async () => {
	return json(await getContextSnapshot());
};
//#endregion
export { GET };
