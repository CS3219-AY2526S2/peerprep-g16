import Redis from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// General-purpose client (GET/SET operations)
const redisClient = new Redis(redisConfig);

// Dedicated subscriber (Pub/Sub requires its own connection)
const redisSubscriber = new Redis(redisConfig);

// Dedicated publisher
const redisPublisher = new Redis(redisConfig);

redisClient.on("connect", () => console.log("✅ Redis client connected"));
redisClient.on("error", (err) => console.error("❌ Redis client error:", err));

redisSubscriber.on("connect", () => console.log("✅ Redis subscriber connected"));
redisPublisher.on("connect", () => console.log("✅ Redis publisher connected"));

export { redisClient, redisSubscriber, redisPublisher };
