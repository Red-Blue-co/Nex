"use strict";

const mysql = require("mysql2");

const { ApplicationError, logMessage } = require("./applicationerror");
const { NE_Environment } = require("./settings");

const connectionPools = {};

const deepClone = (obj) => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};


class MySQLDB_Helper {
  static dbType = "mysql";

  static connectToDB() {
    try {
      const config = MySQLDB_Helper.getDbConfig();
      const { database } = config;
      
      if (!database) {
        logMessage({ level: "WARNING", message: "MySQL Database name missing in config. Skipping connection." });
        return;
      }

      if (!connectionPools[database]) {
        connectionPools[database] = mysql.createPool({
            ...config,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        }).promise();

        logMessage({ level: "SUCCESS", message: `MySQL connection pool established for [${database}]` });
      }
    } catch (err) {
      logMessage({ level: "ERROR", message: "Failed to initialize MySQL connection.", errorObject: err });
   }
  }

  static async getConnectionPool() {
    const config = MySQLDB_Helper.getDbConfig();
    const dbName = config.database;

    if (!connectionPools[dbName]) {
      MySQLDB_Helper.connectToDB();
      if (!connectionPools[dbName]) {
          throw new ApplicationError(`No active connection pool for database: ${dbName}`);
      }
    }
    return connectionPools[dbName];
  }

  /**
   * Execute a Single Query
   * @param {string} sqlQuery 
   * @param {Array} params 
   */
  static async executeQuery(sqlQuery, params = []) {
    try {
      const pool = await MySQLDB_Helper.getConnectionPool();
      
      const [rows] = await pool.query(sqlQuery, params);

      return deepClone(rows);

    } catch (err) {
      const errorMsg = `MySQL Query Failed: ${err.sqlMessage || err.message}`;
      logMessage({ level: "ERROR", message: errorMsg, errorObject: err });
      
      throw new ApplicationError(errorMsg, err);
    }
  }

  /**
   * Execute a Transaction with multiple queries
   * @param {Array<{sql: string, params: Array}>} queries - List of query objects
   */
  static async executeTransaction(queries) {
    let connection = null;
    try {
      const pool = await MySQLDB_Helper.getConnectionPool();
      
      // Get dedicated connection for transaction
      connection = await pool.getConnection();
      
 
      await connection.beginTransaction();
      logMessage({ level: "INFO", message: "MySQL Transaction Started" });

      let results = [];
      
      for (const { sql, params } of queries) {
        const [result] = await connection.query(sql, params);
        results.push(deepClone(result));
      }
      await connection.commit();
      logMessage({ level: "SUCCESS", message: "MySQL Transaction Committed" });
      
      return results;

    } catch (err) {
      if (connection) {
        await connection.rollback();
        logMessage({ level: "WARNING", message: "MySQL Transaction Rolled Back" });
      }
      
      throw new ApplicationError(`Transaction Failed: ${err.message}`, err);
    } finally {
      if (connection) connection.release();
    }
  }


  static getDbConfig() {
    try {
        return {
          host: NE_Environment.getEnvironmentVariable("MYSQLDB_HOST") ,
          port: NE_Environment.getEnvironmentVariable("MYSQLDB_PORT") || 3306,
          user: NE_Environment.getEnvironmentVariable("MYSQLDB_USER") || "root",
          password: NE_Environment.getEnvironmentVariable("MYSQLDB_PASSWORD") ,
          database: NE_Environment.getEnvironmentVariable("MYSQLDB_NAME")  ,
        };
    } catch (e) {
        return {}; 
    }
  }
}
MySQLDB_Helper.connectToDB();

module.exports = { MySQLDB_Helper };