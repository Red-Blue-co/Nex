const path = require('path');
const fs = require('fs');

/**
 * --- Configuration & Constants ---
 */
const LOG_FILE_PATH = path.join(process.cwd(), 'application.log');
const PROJECT_STRUCT_FILE = path.join(process.cwd(), 'projectOrganization.js');
const NO_ERROR_CODE = "000000";

// ANSI Colors for Console
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  CYAN: "\x1b[36m",
  GRAY: "\x1b[90m"
};


let projectStructure = [];
try {
  if (fs.existsSync(PROJECT_STRUCT_FILE)) {
    const loaded = require(PROJECT_STRUCT_FILE);
    projectStructure = loaded.__projectStructure || [];
  }
} catch (error) {
  console.warn(`${COLORS.YELLOW}[WARN] Could not load project structure for error codes.${COLORS.RESET}`);
}

const logStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' });

const getTimestamp = () => {
  return new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '');
};

// Safely stringify objects for logging
const formatData = (data) => {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch (err) {
    return String(data);
  }
};

// Parse the Stack Trace to find where the error originated
const getCallerLocation = () => {
  const originalStack = new Error().stack;
  const stackLines = originalStack.split('\n');

  // Skip the first line (Error message) and the lines from this file itself
  for (let i = 1; i < stackLines.length; i++) {
    const line = stackLines[i];
    
    if (!line.includes('node:') && !line.includes(__filename)) {
      // Regex to extract file path, line, and column
      const match = line.match(/\((.*):(\d+):(\d+)\)/) || line.match(/at (.*):(\d+):(\d+)/);
      if (match) {
        return {
          fullPath: match[1],
          fileName: path.basename(match[1]),
          line: parseInt(match[2], 10)
        };
      }
    }
  }
  return { fileName: 'Unknown', line: 0, fullPath: '' };
};

const generateErrorCode = (fileName, lineNumber) => {
  
  let index = projectStructure.indexOf(fileName);
  if (index === -1) {
    index = projectStructure.findIndex(f => 
      f.endsWith(`/${fileName}`) || f.endsWith(`\\${fileName}`)
    );
  }
  const fileIndex = index !== -1 ? index + 1 : 999;
  return `NE0000F${fileIndex.toString().padStart(3, '0')}L${lineNumber.toString().padStart(4, '0')}`;
};


const logMessage = ({ level = 'INFO', message, errorObject = null, customLocation = null, errorCode = null }) => {
  const timestamp = getTimestamp();
  const loc = customLocation || getCallerLocation();
  const identifier = errorCode || `${loc.fileName}:${loc.line}`;
  let color = COLORS.CYAN;
  let emoji = "ℹ️";

  switch (level) {
    case 'WARNING': color = COLORS.YELLOW; emoji = "⚠️"; break;
    case 'ERROR':   color = COLORS.RED;    emoji = "❌"; break;
    case 'SUCCESS': color = COLORS.GREEN;  emoji = "✅"; break;
  }
  const consoleMsg = `${COLORS.GRAY}[${timestamp}]${COLORS.RESET} ${color}[${level}]${COLORS.RESET} ${emoji} ${COLORS.GRAY}${loc.fileName}:${loc.line}${COLORS.RESET} -> ${formatData(message)}`;
  console.log(consoleMsg);

  if (errorObject) {
    console.log(`${COLORS.RED}Stack Trace:${COLORS.RESET}`, errorObject.stack || errorObject);
  }
  const fileMsg = `[${timestamp}] [${level}] [${identifier}] -> ${formatData(message)} ${errorObject ? '| ERROR: ' + formatData(errorObject) : ''}\n`;

  if (logStream.writable) {
    logStream.write(fileMsg);
  } else {
    try { fs.appendFileSync(LOG_FILE_PATH, fileMsg); } catch (e) {}
  }
};

class ApplicationError extends Error {
  constructor(message = 'An unexpected error occurred', errorObject = null) {
    super(message);
    

    const loc = getCallerLocation();
    
    this.name = 'ApplicationError';
    this.timestamp = getTimestamp();
    this.message = message;
    this.originalError = errorObject;
    this.errorCode = generateErrorCode(loc.fileName, loc.line);
    
    this.debugInfo = {
      file: loc.fileName,
      line: loc.line,
      code: this.errorCode
    };

    
    logMessage({
      level: 'ERROR',
      message: this.message,
      errorObject: this.originalError || this,
      customLocation: loc,
      errorCode: this.errorCode
    });
  }

  // Returns standard API Error Response
  getErrorObject() {
    return {
      status: 'FAILURE',
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      debug: process.env.NODE_ENV === 'development' ? this.debugInfo : undefined
    };
  }
}

class ApplicationSuccess {
  static getSuccessObject(result, message = 'Operation successful') {
    const loc = getCallerLocation();
    
    logMessage({ level: 'SUCCESS', message, customLocation: loc });

    return {
      status: 'SUCCESS',
      errorCode: NO_ERROR_CODE,
      message: message,
      timestamp: getTimestamp(),
      data: result
    };
  }
}


const initializeGlobalErrorHandler = () => {
  process.on('uncaughtException', (err) => {
    // Prevent recursive loop if the error is already handled
    if (err instanceof ApplicationError) process.exit(1);

    // Create new AppError to ensure it gets logged to file
    new ApplicationError(`CRITICAL: Uncaught Exception - ${err.message}`, err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    if (reason instanceof ApplicationError) return;
    new ApplicationError(`CRITICAL: Unhandled Promise Rejection`, reason);
  });
};

module.exports = {
  ApplicationError,
  ApplicationSuccess,
  NO_ERROR: NO_ERROR_CODE,
  initializeGlobalErrorHandler,
  logMessage
};