import "dotenv/config";
import http from "http";
import index from "./index.js";
import { connectToDB } from "./model/repository.js";
import { initializeBlacklistService } from "./services/tokenBlacklistService.js";
import { startSessionConsumer } from "./stream/session-consumer.js";

const port = process.env.PORT || 3001;
const server = http.createServer(index);

await connectToDB().then(async () => {
  console.log("MongoDB Connected!");

  // ✅ Initialize Redis blacklist service before starting server
  await initializeBlacklistService();

  server.listen(port);
  console.log("User service server listening on http://localhost:" + port);
  startSessionConsumer().catch((err) =>
    console.error("Session consumer failed to start:", err.message),
  );
}).catch((err) => {
  console.error("Failed to connect to DB");
  console.error(err);
});
