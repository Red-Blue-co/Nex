"use strict";

const { MongoClient, ObjectId } = require("mongodb");


const { ApplicationError, logMessage } = require("./applicationerror");
const { NE_Environment } = require("./settings"); 

let _dbClient = null;
let _dbInstance = null;


const deepClone = (obj) => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};


const prepareUpdateObject = ({ setObject, unsetObject, pushObject, pullObject }) => {
  const updateCmd = {};
  if (setObject && Object.keys(setObject).length > 0) updateCmd.$set = setObject;
  if (unsetObject && Object.keys(unsetObject).length > 0) updateCmd.$unset = unsetObject;
  if (pushObject && Object.keys(pushObject).length > 0) updateCmd.$push = pushObject;
  if (pullObject && Object.keys(pullObject).length > 0) updateCmd.$pull = pullObject;
  return updateCmd;
};


class MongoDB_Helper {
  static dbType = 'mongodb';


  static async connectToDB() {
    try {
      if (_dbInstance) return _dbInstance; // Return cached connection

      const url = NE_Environment.getEnvironmentVariable("MONGODB_URL");
      const dbName = NE_Environment.getEnvironmentVariable("MONGODB_NAME");
      const user = NE_Environment.getEnvironmentVariable("MONGODB_USER");
      const pass = NE_Environment.getEnvironmentVariable("MONGODB_PASSWORD");

      if (!url || !dbName) {
        logMessage({ level: "WARNING", message: "MongoDB Config missing. Skipping connection." });
        return null;
      }

      let connectionUri = url.startsWith("mongodb") ? url : `mongodb://${url}`;
      if (user && pass && !url.includes("@")) {
      
          connectionUri = connectionUri.replace("mongodb://", `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`);
      }

   
      _dbClient = new MongoClient(connectionUri, {
          minPoolSize: 5,
          maxPoolSize: 20
      });

      await _dbClient.connect();
      _dbInstance = _dbClient.db(dbName);
      
      logMessage({ level: "SUCCESS", message: `Connected to MongoDB: [${dbName}]` });
      return _dbInstance;

    } catch (err) {
      logMessage({ level: "ERROR", message: "Failed to connect to MongoDB", errorObject: err });
      throw new ApplicationError("MongoDB Connection Failed", err);
    }
  }


  static async getCollection(collectionName) {
    if (!_dbInstance) await MongoDB_Helper.connectToDB();
    if (!_dbInstance) throw new ApplicationError("Database not connected");
    
    return _dbInstance.collection(collectionName);
  }

  
    //FIND Records
   
  static async findRecords(collectionName, query = {}, { select = {}, sort = {}, limit = 0, skip = 0 } = {}) {
    try {
      const col = await MongoDB_Helper.getCollection(collectionName);
      
      let cursor = col.find(query);

      if (Object.keys(select).length > 0) cursor = cursor.project(select);
      if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (skip > 0) cursor = cursor.skip(skip);
      if (limit > 0) cursor = cursor.limit(limit);

      const results = await cursor.toArray();
      return deepClone(results);
    } catch (err) {
      throw new ApplicationError(`Find failed in [${collectionName}]`, err);
    }
  }

  
   // INSERT Records
   
  static async insertRecords(collectionName, data) {
    try {
      const col = await MongoDB_Helper.getCollection(collectionName);
      let result;
      
      if (Array.isArray(data)) {
        result = await col.insertMany(data);
      } else {
        result = await col.insertOne(data);
      }
      return result;
    } catch (err) {
      throw new ApplicationError(`Insert failed in [${collectionName}]`, err);
    }
  }

  
   // UPDATE Records

  static async updateRecords(collectionName, criteria, { oneRecordOnly = false, setObject, unsetObject, pushObject, pullObject } = {}) {
    try {
      const col = await MongoDB_Helper.getCollection(collectionName);
      const updateCmd = prepareUpdateObject({ setObject, unsetObject, pushObject, pullObject });
      
      if (Object.keys(updateCmd).length === 0) return { modifiedCount: 0 }; 

      if (oneRecordOnly) {
        return await col.updateOne(criteria, updateCmd);
      } else {
        return await col.updateMany(criteria, updateCmd);
      }
    } catch (err) {
      throw new ApplicationError(`Update failed in [${collectionName}]`, err);
    }
  }

  
    //DELETE Records
   
  static async deleteRecords(collectionName, criteria, oneRecordOnly = false) {
    try {
      const col = await MongoDB_Helper.getCollection(collectionName);
      
      if (oneRecordOnly) {
        return await col.deleteOne(criteria);
      } else {
        return await col.deleteMany(criteria);
      }
    } catch (err) {
      throw new ApplicationError(`Delete failed in [${collectionName}]`, err);
    }
  }

  
    //AGGREGATE
   
  static async aggregate(collectionName, pipeline) {
    try {
      const col = await MongoDB_Helper.getCollection(collectionName);
      const results = await col.aggregate(pipeline).toArray();
      return deepClone(results);
    } catch (err) {
      throw new ApplicationError(`Aggregation failed in [${collectionName}]`, err);
    }
  }

  
    //Transaction Wrapper
   
  static async runTransaction(operationCallback) {
    if (!_dbClient) await MongoDB_Helper.connectToDB();
    const session = _dbClient.startSession();
    
    try {
      session.startTransaction();
      logMessage({ level: "INFO", message: "MongoDB Transaction Started" });

      const result = await operationCallback(session, _dbInstance);

      await session.commitTransaction();
      logMessage({ level: "SUCCESS", message: "MongoDB Transaction Committed" });
      return result;

    } catch (err) {
      await session.abortTransaction();
      logMessage({ level: "WARNING", message: "MongoDB Transaction Rolled Back" });
      throw err;
    } finally {
      await session.endSession();
    }
  }
}


MongoDB_Helper.connectToDB();

module.exports = { MongoDB_Helper };