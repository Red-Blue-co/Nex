"use strict";

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (e) {}

const { NE_Utils } = require('./utils');
const { ApplicationError, logMessage } = require('./applicationerror');

class NE_Environment {
    static envObject = {};
    static environment = null;
    static rootDir = process.cwd();
    static progFileName = path.basename(require.main ? require.main.filename : __filename);
    static confFileName = `${path.basename(NE_Environment.progFileName, path.extname(NE_Environment.progFileName))}.conf`;
    static requestParams = {};
    static get ROOT_DIRECTORY() { return NE_Environment.rootDir; }
    static set ROOT_DIRECTORY(dirName) { NE_Environment.rootDir = dirName; }
    static get PROGRAM_FILENAME() { return NE_Environment.progFileName; }
    static get CONFIG_FILENAME() { return NE_Environment.confFileName; }
    static set CONFIG_FILENAME(fileName) { NE_Environment.confFileName = fileName; }
    static get UPLOAD_DIRECTORY() {
        const uploadDir = NE_Environment.getEnvironmentVariable('UPLOAD_DIRECTORY');
        return uploadDir ? path.join(NE_Environment.ROOT_DIRECTORY, uploadDir) : undefined;
    }
    static get JWT_SECRET() { return NE_Environment.getEnvironmentVariable('JWT_SECRET'); }
    static get APPLICATION_PORT_NUMBER() { return NE_Environment.getEnvironmentVariable('APPLICATION_PORT_NUMBER'); }

    /**
     * Retrieve a variable from the loaded configuration
     */
    static getEnvironmentVariable(varName) {
        return NE_Environment.envObject[varName] || process.env[varName];
    }

    /**
     * Recursively flattens a configuration object.
     * Extracts keys from groups like 'MYSQL_GROUP' to the top level.
     */
    static flattenConfig(source, target = {}) {
        Object.keys(source).forEach(key => {
            const value = source[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                NE_Environment.flattenConfig(value, target);
            } else {
                target[key] = value;
            }
        });
        return target;
    }

    /**
     * Reads the .conf file and populates envObject
     */
    static readAndSetConfiguration() {
        try {
            const configFilePath = path.join(NE_Environment.ROOT_DIRECTORY, NE_Environment.confFileName);
            const configurationData = NE_Utils.loadConfig(configFilePath);
            if (!configurationData[NE_Environment.environment]) {
                logMessage({ level: 'WARNING', message: `Environment [${NE_Environment.environment}] not found in config file. Using process.env defaults.` });
                NE_Environment.envObject = process.env; 
                return;
            }

            const rawConfig = configurationData[NE_Environment.environment];
            NE_Environment.envObject = NE_Environment.flattenConfig(rawConfig);
            Object.assign(process.env, NE_Environment.envObject);

            logMessage({ level: 'INFO', message: `Environment loaded: [${NE_Environment.environment}]` });

        } catch (err) {
            throw new ApplicationError("Failed to read configuration file", err);
        }
    }

    /**
     * Main Initialization
     */
    static async setEnvironment() {
        try {
            const cliArgs = await NE_Utils.processCli();
            NE_Environment.environment = cliArgs.runEnv || process.env['NE_ENV'] || "Local";
            NE_Environment.readAndSetConfiguration();

            return cliArgs;
        } catch (err) {
            if (err instanceof ApplicationError) throw err;
            throw new ApplicationError("Environment Initialization Failed", err);
        }
    }
}

module.exports = { NE_Environment };