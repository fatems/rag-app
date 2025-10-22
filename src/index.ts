import { startServer } from "./server/server.js";

startServer().catch((err) => {
	console.error("Fatal start error:", err);
	process.exit(1);
});
