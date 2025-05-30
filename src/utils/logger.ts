import { createLogger, format, transports, Logger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { config } from "../config/app.config";

const logDir = path.resolve(process.cwd(), "logs");

const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const developmentFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${stack || message}`;
    if (Object.keys(meta).length) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const logger: Logger = createLogger({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  format: config.NODE_ENV === "production" ? productionFormat : developmentFormat,
  transports: [
    new transports.Console({ stderrLevels: ["error"] }),
    new DailyRotateFile({
      dirname: logDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "14d",
      zippedArchive: true,
    }),
    new DailyRotateFile({
      dirname: logDir,
      filename: "combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      zippedArchive: true,
    }),
  ],
  exitOnError: false,
});

// Morgan integration stream
(logger as any).stream = {
  write: (message: string) => {
    // Morgan adds newline, trim it
    logger.http(message.trim());
  },
};

export default logger;
