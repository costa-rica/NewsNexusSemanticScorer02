const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Determine environment
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTesting = nodeEnv === "testing";
const isDevelopment = nodeEnv === "development";

const appName = process.env.NAME_APP || "app";
const logDir = process.env.PATH_TO_LOGS || "./logs";
const maxSize = parseInt(process.env.LOG_MAX_SIZE) || 10485760; // 10MB
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || 10;

// Determine log level based on environment
let logLevel;
if (isProduction) {
  logLevel = "error"; // Only errors in production
} else if (isTesting) {
  logLevel = "info"; // Info and above in testing
} else {
  logLevel = "debug"; // All levels in development
}

// Define log format for files
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${appName}] ${message}${metaStr}`;
  })
);

// Define log format for console (development)
const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `${timestamp} ${level} [${appName}] ${message}${metaStr}`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  transports: [],
});

// Add transports based on environment
if (isProduction || isTesting) {
  // Production and Testing: Write to files
  try {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      logger.warn(`Created log directory: ${logDir}`);
    }

    logger.add(
      new winston.transports.File({
        filename: path.join(logDir, `${appName}.log`),
        maxsize: maxSize,
        maxFiles: maxFiles,
        tailable: true,
        format: fileLogFormat,
      })
    );
  } catch (error) {
    // Fall back to console logging if file logging fails
    logger.error(
      `Failed to initialize file logging: ${error.message}. Falling back to console.`
    );
    logger.add(
      new winston.transports.Console({
        format: consoleLogFormat,
      })
    );
  }
} else {
  // Development: Console only
  logger.add(
    new winston.transports.Console({
      format: consoleLogFormat,
    })
  );
}

// Monkey-patch console methods
logger.info = (...args) => logger.info(args.join(" "));
logger.error = (...args) => logger.error(args.join(" "));
logger.warn = (...args) => logger.warn(args.join(" "));
logger.info = (...args) => logger.info(args.join(" "));
logger.debug = (...args) => logger.debug(args.join(" "));

module.exports = logger;
