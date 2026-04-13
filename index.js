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
const HexGenerator = require('./essentials/qrCode');
const RobustHexScanner  = require('./essentials/qrScanner');

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
  HexGenerator,
  RobustHexScanner
};