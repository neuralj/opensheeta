import { t as getTimeline } from "../../../../chunks/timeline.js";
import { json } from "@sveltejs/kit";
//#region src/routes/api/timeline/+server.ts
var GET = async ({ url }) => {
	return json(await getTimeline(parseInt(url.searchParams.get("limit") ?? "50")));
};
//#endregion
export { GET };
