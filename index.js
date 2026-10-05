"use strict";

// --- 1. Core Error Handling ---
const { 
  ApplicationError, 
  ApplicationSuccess, 
  NO_ERROR, 
  logMessage 
} = require('./essentials/applicationerror');

const initializeGlobalErrorHandler = () => {
    process.on('uncaughtException', (err) => {
        logMessage({ level: "CRITICAL", message: "Uncaught Exception", errorObject: err });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logMessage({ level: "CRITICAL", message: "Unhandled Rejection", errorObject: reason });
    });
};


initializeGlobalErrorHandler();

// --- 2. Configuration ---
const { NE_Environment } = require('./essentials/settings');

// --- 3. Database Helpers ---
const { MySQLDB_Helper } = require('./essentials/mysqldb_helper');
const { MsSQLDB_Helper } = require('./essentials/mssqldb_helper');
const { MongoDB_Helper } = require('./essentials/mongodb_helper');

// --- 4. Session & Logic ---
const { UserSessions_Helper, LoggedInUser } = require('./essentials/usersession');
const { Implementation_Manager } = require('./essentials/implementationmanager');

// --- 5. Feature Helpers ---
const { NE_EmailHelper, NE_EmailSender } = require('./essentials/emailhelper');
const { UploadHelper } = require('./essentials/fileuploadhelper');

// --- 6. Utility Functions ---
const {NE_Utils }= require('./essentials/utils')

const use = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  
  ApplicationError,
  ApplicationSuccess,
  NO_ERROR,
  logMessage,
  initializeGlobalErrorHandler,
  use,
  NE_Environment,
  MySQLDB_Helper,
  MsSQLDB_Helper,
  MongoDB_Helper,
  UserSessions_Helper,
  LoggedInUser,
  Implementation_Manager,
  NE_EmailHelper,
  NE_EmailSender,
  UploadHelper,
  NE_Utils,
};

// QR helpers need the optional `canvas` package, so they load only when first used.
// Apps that never touch QR codes can install and run sv-nex without canvas.
Object.defineProperty(module.exports, 'HexGenerator', { enumerable: true, get: () => require('./essentials/qrCode') });
Object.defineProperty(module.exports, 'RobustHexScanner', { enumerable: true, get: () => require('./essentials/qrScanner') });