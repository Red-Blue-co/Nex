"use strict";

const http = require('http');
const https = require('https');
const { MongoDB_Helper } = require("./mongodb_helper");
const { MySQLDB_Helper } = require("./mysqldb_helper");
const { MsSQLDB_Helper } = require('./mssqldb_helper');
const { NE_Environment } = require("./settings");
const { ApplicationError, logMessage } = require('./applicationerror');
const { NE_HttpServer } = require("./httphelper");

class Implementation_Manager {
  
  static initializeImplementation = async (dbKeysMappingTable = null, dbType = 'mysql') => {
    try {
       logMessage({ level: 'INFO', message: "Initializing Implementation..." });
      await initDbConnectionsForImplementation();
    } catch (err) {
      logMessage({ level: 'ERROR', message: `Error in Initialization: ${err.message}`, errorObject: err });
      throw err instanceof ApplicationError ? err : new ApplicationError({ errorObject: err });
    }
  }

  static getSystemParameters = async (sysParamTableName = null) => {
    try {
      if (!sysParamTableName) {
        return [];
      }
      return await getSystemParametersForSolution(sysParamTableName);
    } catch (err) {
      logMessage({ level: 'ERROR', message: `Error fetching system parameters: ${err.message}`, errorObject: err });
      throw err instanceof ApplicationError ? err : new ApplicationError({ errorObject: err });
    }
  }

  static setViewEngine = () => {
    NE_HttpServer.setViewEngine();
  }

  static setApiErrorHandler(apiErrorHandlerFunction) {
    NE_HttpServer.ApiErrorHandler = apiErrorHandlerFunction;
  }

  static setApiNotFoundHandler(apiNotFoundHandlerFunction) {
    NE_HttpServer.ApiNotFoundHandler = apiNotFoundHandlerFunction;
  }

  static initializeHttpAndStartServer = (routes) => {
    logMessage({ level: 'INFO', message: "Starting HTTP Server..." });
    NE_HttpServer.initializeAndStartHttpService(routes);
  }

  static setWebSocketEventHandlers = (socketEventHandlers) => {
    NE_HttpServer.setWebSocketEventHandlers(socketEventHandlers);
  }
}

const initDbConnectionsForImplementation = async () => {
  await initIndividualImplementationDbConnection();
}


const initIndividualImplementationDbConnection = async () => {
  
  let dbTypes = NE_Environment.getEnvironmentVariable('DB_TYPE');

  const typesToCheck = Array.isArray(dbTypes) ? dbTypes : (dbTypes || '').split(',');

  if (typesToCheck.some(t => t.includes('mysql'))) {
    await MySQLDB_Helper.connectToDB();
  }
  if (typesToCheck.some(t => t.includes('mongodb'))) {
    await MongoDB_Helper.connectToDB();
  }
  if (typesToCheck.some(t => t.includes('mssql'))) {
    await MsSQLDB_Helper.connectToDB();
  }
}


const getSystemParametersForSolution = async (sysParamTableName = null) => {
  try {
    // Defaulting to MySQL for system params as per original logic
    return await MySQLDB_Helper.executeQuery("SELECT * FROM ??", [sysParamTableName]);
  } catch (err) {
    logMessage({ level: 'ERROR', message: `Error fetching system parameters: ${err.message}`, errorObject: err });
    throw err instanceof ApplicationError ? err : new ApplicationError({ errorObject: err });
  }
}

const callHTTPRequest = (apiName, method, datajson = null) => {
  return new Promise((resolve, reject) => {
    
    let data = "";
    let headersObj = { 'Content-Type': 'application/json' };

    if (method === 'GET' && datajson) {
      apiName += `?criteria=${JSON.stringify(datajson)}`;
    } else if (method === 'POST' && datajson) {
      data = JSON.stringify({ criteria: datajson });
      headersObj['Content-Length'] = Buffer.byteLength(data);
    }

    const options = {
      hostname: NE_Environment.getEnvironmentVariable('SERVICE_HOST'),
      port: NE_Environment.getEnvironmentVariable('SERVICE_PORT'),
      path: apiName,
      method: method,
      headers: headersObj,
      protocol: NE_Environment.getEnvironmentVariable('SSL_ENABLED') === 'yes' ? 'https:' : 'http:'
    };

    const requestModule = options.protocol === 'https:' ? https : http;

    const req = requestModule.request(options, res => {
      let dataArr = [];
      res.on('data', chunk => dataArr.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(dataArr).toString()));
        } catch(parseErr) {
          reject(new ApplicationError({ errorObject: parseErr }));
        }
      });
    });

    req.on('error', err => reject(new ApplicationError({ errorObject: err })));
    if (method === 'POST') req.write(data);
    req.end();
  });
}

module.exports = { Implementation_Manager };