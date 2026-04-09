"use strict";

const sql = require('mssql');
const { ApplicationError, logMessage } = require('./applicationerror');
const { NE_Environment } = require('./settings');

let _connectionPool = null;

const deepClone = (obj) => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};

class MsSQLDB_Helper {
  static dbType = 'mssql';

  static async connectToDB() {
    try {
      if (_connectionPool) return _connectionPool;

      const config = MsSQLDB_Helper.getDbConfig();
      
      if (!config.server || !config.database) {
        return null;
      }
      _connectionPool = await new sql.ConnectionPool(config).connect();
      
      logMessage({ level: "SUCCESS", message: `Connected to MSSQL: [${config.database}] on [${config.server}]` });
      return _connectionPool;

    } catch (err) {
      logMessage({ level: "ERROR", message: "Failed to connect to MSSQL", errorObject: err });
      throw new ApplicationError("MSSQL Connection Failed", err);
    }
  }

  static async getConnectionPool() {
    if (!_connectionPool) await MsSQLDB_Helper.connectToDB();
    if (!_connectionPool) throw new ApplicationError("MSSQL Database not connected");
    return _connectionPool;
  }


  static async executeQuery(sqlQuery, inputParams = {}) {
    try {
      const pool = await MsSQLDB_Helper.getConnectionPool();
      
      const request = pool.request();
      
      Object.entries(inputParams).forEach(([key, value]) => {
          request.input(key, value);
      });

      const result = await request.query(sqlQuery);
      return deepClone(result.recordset);

    } catch (err) {
      throw new ApplicationError(`MSSQL Query Execution Failed: ${sqlQuery}`, err);
    }
  }

  /**
   * Execute Transaction
   * @param {Array<{sql: string, params: Object}>} queries
   */
  static async executeTransaction(queries) {
    let transaction = null;
    try {
      const pool = await MsSQLDB_Helper.getConnectionPool();
      
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      logMessage({ level: "INFO", message: "MSSQL Transaction Started" });

      const results = [];
      
      for (const { sql: queryStr, params } of queries) {
        const request = new sql.Request(transaction);
      
        if (params) {
            Object.entries(params).forEach(([key, value]) => request.input(key, value));
        }

        const result = await request.query(queryStr);
        results.push(deepClone(result.recordset));
      }

      await transaction.commit();
      logMessage({ level: "SUCCESS", message: "MSSQL Transaction Committed" });
      return results;

    } catch (err) {
      if (transaction) await transaction.rollback();
      logMessage({ level: "WARNING", message: "MSSQL Transaction Rolled Back" });
      throw new ApplicationError("MSSQL Transaction Failed", err);
    }
  }

  static getDbConfig() {
    try {
        const baseConfig = {
            server: NE_Environment.getEnvironmentVariable("MSSQLDB_HOST"),
            user: NE_Environment.getEnvironmentVariable("MSSQLDB_USER"),
            password: NE_Environment.getEnvironmentVariable("MSSQLDB_PASSWORD"),
            database: NE_Environment.getEnvironmentVariable("MSSQLDB_NAME"),
            options: {
                encrypt: true, 
                trustServerCertificate: true 
            }
        };
        const extraOptions = NE_Environment.getEnvironmentVariable("MSSQLDB_OPTIONS");
        if (extraOptions) {
            const parsed = JSON.parse(extraOptions);
            return { ...baseConfig, ...parsed };
        }

        return baseConfig;
    } catch (e) {
        return {};
    }
  }
}


MsSQLDB_Helper.connectToDB();

module.exports = { MsSQLDB_Helper };