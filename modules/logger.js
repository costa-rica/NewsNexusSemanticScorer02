const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Validate required environment variables
const requiredEnvVars = ["NODE_ENV", "NAME_APP", "PATH_TO_LOGS"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    process.stderr.write(
      `FATAL ERROR: Required environment variable ${varName} is not set.\n`
    );
    process.exit(1);
  }
}

// Determine environment
const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === "production";
const isTesting = nodeEnv === "testing";
const isDevelopment = nodeEnv === "development";

const appName = process.env.NAME_APP;
const logDir = process.env.PATH_TO_LOGS;
// Convert LOG_MAX_SIZE from megabytes to bytes (default: 5MB)
const maxSizeMB = parseInt(process.env.LOG_MAX_SIZE) || 5;
const maxSize = maxSizeMB * 1024 * 1024;
const maxFiles = parseInt(process.env.LOG_MAX_FILES) || 5;

// Determine log level based on environment
let logLevel;
if (isProduction) {
  logLevel = "info"; // Info and above in production
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
if (isProduction) {
  // Production: Log files only
  try {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
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
    process.stderr.write(
      `Failed to initialize file logging: ${error.message}. Falling back to console.\n`
    );
    logger.add(
      new winston.transports.Console({
        format: consoleLogFormat,
      })
    );
  }
} else if (isTesting) {
  // Testing: Both console AND log files
  try {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
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
    // Log error but continue with console logging
    process.stderr.write(
      `Failed to initialize file logging: ${error.message}.\n`
    );
  }

  // Always add console in testing mode
  logger.add(
    new winston.transports.Console({
      format: consoleLogFormat,
    })
  );
} else {
  // Development: Console only
  logger.add(
    new winston.transports.Console({
      format: consoleLogFormat,
    })
  );
}

module.exports = logger;
