import mongoose from "mongoose";
import logger from "../utils/logger"; // assuming this is your logger path
import { config } from "./app.config";

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(config.MONGO_URI);
    logger.info("Connected to Mongo database", { host: conn.connections[0].host });
  } catch (error) {
    logger.error("Error connecting to Mongo database", { error });
    process.exit(1);
  }
};

const closeDatabase = async () => {
  try {
    await mongoose.connection.close();
    logger.info("Mongo database connection closed");
  } catch (error) {
    logger.error("Error closing Mongo database connection", { error });
  }
};

export default connectDatabase;
export { closeDatabase };
