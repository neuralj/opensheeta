import { n as getRepoState } from "../../../../chunks/state.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/state/+server.ts
var GET = async () => {
	return json(await getRepoState());
};
//#endregion
export { GET };
