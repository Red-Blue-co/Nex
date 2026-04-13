"use strict";
const NE_ConfigSetup = {
    // --- 1. Database Selection ---
    DB_TYPE: {
        type: "string_array",
        configKey: "DB_TYPE",
        infoText: "Database Configuration",
        question: "Which database(s) will you use? (comma separated: mysql, mongodb, mssql)",
        answers: {
            "mysql": "mysql",
            "mongodb": "mongodb",
            "mssql": "mssql"
        }
    },

    // --- 2. Database Specific Details ---
    MYSQLDB_DETAILS: {
        type: "keys_group",
        configKey: "MYSQL_GROUP",
        infoText: "MySQL Connection Details",
        MYSQL_GROUP: [
            { type: "string", configKey: "MYSQLDB_HOST", question: "MySQL Host" },
            { type: "string", configKey: "MYSQLDB_NAME", question: "MySQL Database Name" },
            { type: "string", configKey: "MYSQLDB_USER", question: "MySQL User" },
            { type: "string", configKey: "MYSQLDB_PASSWORD", question: "MySQL Password" }
        ]
    },

    MONGODB_DETAILS: {
        type: "keys_group",
        configKey: "MONGO_GROUP",
        infoText: "MongoDB Connection Details",
        MONGO_GROUP: [
            { type: "string", configKey: "MONGODB_URL", question: "MongoDB Connection String (URI)" },
            { type: "string", configKey: "MONGODB_DBNAME", question: "MongoDB Database Name" }
        ]
    },

    MSSQLDB_DETAILS: {
        type: "keys_group",
        configKey: "MSSQL_GROUP",
        infoText: "Microsoft SQL Server Details",
        MSSQL_GROUP: [
            { type: "string", configKey: "MSSQL_SERVER", question: "MSSQL Server Host" },
            { type: "string", configKey: "MSSQL_DATABASE", question: "MSSQL Database Name" },
            { type: "string", configKey: "MSSQL_USER", question: "MSSQL User" },
            { type: "string", configKey: "MSSQL_PASSWORD", question: "MSSQL Password" }
        ]
    },

    // --- 3. Server Settings ---
    APPLICATION_PORT_NUMBER: {
        type: "number",
        configKey: "APPLICATION_PORT_NUMBER",
        infoText: "Server Configuration",
        question: "Application Port Number"
    },

    SSL_CONNECTION: {
        type: "string",
        configKey: "SSL_CONNECTION",
        question: "Enable SSL (HTTPS)?",
        answers: { "y": "yes", "n": "no", "yes": "yes", "no": "no" }
    },

    SSL_CERTIFICATE_KEYS: {
        type: "keys_group",
        configKey: "SSL_FILES",
        infoText: "SSL Certificate Paths",
        SSL_FILES: [
            { type: "string", configKey: "SSL_PRIVATEKEY_FILE_PATH", question: "Path to Private Key (e.g., key.pem)" },
            { type: "string", configKey: "SSL_CERTIFICATE_FILE_PATH", question: "Path to Certificate (e.g., cert.pem)" }
        ]
    },

    // --- 4. Security / JWT ---
    JWT_TOKEN: {
        type: "string",
        configKey: "JWT_TOKEN",
        infoText: "Authentication Settings",
        question: "Enable JWT Token Authentication?",
        answers: { "y": "yes", "n": "no", "yes": "yes", "no": "no" }
    },

    JWT_DETAILS: {
        type: "keys_group",
        configKey: "JWT_GROUP",
        infoText: "JWT Configuration",
        JWT_GROUP: [
            { type: "string", configKey: "JWT_SECRET", question: "JWT Secret Key" },
            { type: "string", configKey: "NO_TOKEN_APIS", question: "Public APIs (comma separated, e.g., /login,/register)", default: "/login,/register" },
            { type: "string", configKey: "REQUEST_PARAMS_FROM_TOKEN", question: "Token Payload Keys to inject into Request (e.g., userId,role)", default: "userId,role" },
            { 
                type: "object", 
                configKey: "TOKEN_EXPIRY", 
                question: "Token Expiry (in minutes)?",
                TOKEN_EXPIRY: [
                    { type: "number", configKey: "W", question: "Web Token Expiry" },
                    { type: "number", configKey: "M", question: "Mobile Token Expiry" }
                ]
            }
        ]
    }
};

const NE_ConfigSequence = [];

module.exports = {
    NE_ConfigSetup,
    NE_ConfigSequence
};