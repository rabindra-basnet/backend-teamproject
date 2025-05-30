import app from "./app";
import net from "net";
import connectDatabase, { closeDatabase } from "./config/database.config";
import { config } from "./config/app.config";
import logger from "./utils/logger";

let server: ReturnType<typeof app.listen>;

const checkPortAvailability = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once("listening", () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
};

const shutdown = async () => {
  logger.info("Gracefully shutting down...");
  try {
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed");
      });
    }
    await closeDatabase();
    logger.info("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
  shutdown();
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", reason);
  shutdown();
});

(async () => {
  const port = config.PORT;
  const isPortAvailable = await checkPortAvailability(port);

  if (!isPortAvailable) {
    logger.error(`Port ${port} is already in use.`);
    process.exit(1);
  }

  try {
    await connectDatabase();
    server = app.listen(port, () => {
      logger.info(`Server running at http://localhost:${port} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
})();
