"use strict";

const jwt = require('jsonwebtoken');
const { ApplicationError, logMessage } = require('./applicationerror');
const { VW_Environment: Environment } = require('./settings');


const ActiveSessions = new Map();
class NE_SessionManager {

    static getMaxSessions() {
        const configuredMax = Environment.getEnvironmentVariable('MAX_CONCURRENT_SESSIONS');
        return configuredMax ? parseInt(configuredMax, 10) : 3;
    }

    static generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    static addUser(userId, userSessionObj) {
        if (!userId) throw new ApplicationError("Cannot add user: Missing User ID");
        let userSessions = ActiveSessions.get(userId) || [];
        userSessions.push(userSessionObj);
        const maxSessions = NE_SessionManager.getMaxSessions();
        
        if (userSessions.length > maxSessions) {
            const removedSession = userSessions.shift(); 
            
            logMessage({ 
                level: 'INFO', 
                message: `User [${userId}] exceeded limit (${maxSessions}). Terminated old session [${removedSession.sessionID}].` 
            });
        }
        ActiveSessions.set(userId, userSessions);
        
        return userSessionObj;
    }
    static removeUserSession(userId, sessionId) {
        const sessions = ActiveSessions.get(userId);
        if (!sessions) return "User Not Found";
        const initialLength = sessions.length;
        const updatedSessions = sessions.filter(s => s.sessionID !== sessionId);
        if (updatedSessions.length === 0) {
            ActiveSessions.delete(userId);
        } else {
            ActiveSessions.set(userId, updatedSessions);
        }

        return updatedSessions.length < initialLength ? "Session Removed" : "Session Not Found";
    }
    static getSession(userId, sessionId) {
        const sessions = ActiveSessions.get(userId);
        if (!sessions) return null;
        return sessions.find(s => s.sessionID === sessionId);
    }
    static generateAccessToken(payload, deviceType) {
        const expiryConfig = Environment.getEnvironmentVariable('TOKEN_EXPIRY') || {};
        const expiresInMins = expiryConfig[deviceType] || 60; // Default 60 mins
             return jwt.sign(payload, Environment.JWT_SECRET, { 
            expiresIn: `${expiresInMins}m` 
        });
    }
    static extractTokenInfo(token) {
        return jwt.decode(token);
    }

    static async validateToken(authFor, authorizationHeader) {
        // 1. Basic Validation of Header
        if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
            throw new ApplicationError("Invalid Authorization Header Format");
        }

        const token = authorizationHeader.split(' ')[1];
        if (!token) throw new ApplicationError("Token missing");

        // 2. Decode Token to get IDs
        const decoded = NE_SessionManager.extractTokenInfo(token);
        if (!decoded || !decoded.userID || !decoded.sessionID) {
            throw new ApplicationError("Invalid Token Structure");
        }

        const { userID, sessionID } = decoded;

        // 3. Retrieve Session from Memory
        const sessionObj = NE_SessionManager.getSession(userID, sessionID);
        
        if (!sessionObj) {
            // This happens if the session was rotated out (Max Limit) or Server Restarted
            throw new ApplicationError("Session expired or invalid. Please login again.");
        }

        // 4. Validate (Check expiry & rotation)
        const validationResponse = await sessionObj.validateAndRenew(token);

        // 5. Add configured parameters to response (e.g. role, email)
        const additionalParams = { userID };
        const keysToInject = Environment.getEnvironmentVariable('REQUST_PARAMS_FROM_TOKEN') || [];
        
        if (Array.isArray(keysToInject)) {
            keysToInject.forEach(key => {
                if (decoded[key] !== undefined) additionalParams[key] = decoded[key];
            });
        }

        return { ...validationResponse, additionalParams };
    }
}
class NE_UserSession {
    constructor(userID, deviceType, tokenPayload) {
        this.userID = userID;
        this.deviceType = deviceType;
        this.sessionID = NE_SessionManager.generateSessionId();
        this.lastUpdatedTime = new Date();

        this.tokenPayload = { ...tokenPayload, userID, sessionID: this.sessionID };
        this.currentToken = NE_SessionManager.generateAccessToken(this.tokenPayload, deviceType);
    }
    validateAndRenew(incomingToken) {
        return new Promise((resolve, reject) => {
            
            // Security: Prevent Replay Attacks
            if (this.currentToken !== incomingToken) {
                return reject(new ApplicationError("Token Mismatch: Potential Replay Attack"));
            }

            // Verify JWT Signature
            jwt.verify(incomingToken, Environment.JWT_SECRET, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return this.handleRenewal(resolve, reject);
                    } else {
                        return reject(new ApplicationError(`Token Verification Failed: ${err.message}`));
                    }
                }

                this.lastUpdatedTime = new Date();
                resolve({ verifyStatus: "Success" });
            });
        });
    }
    handleRenewal(resolve, reject) {
        const now = new Date();
        const diffInMinutes = (now - this.lastUpdatedTime) / (1000 * 60);
        
        const expiryConfig = Environment.getEnvironmentVariable('TOKEN_EXPIRY') || {};
        const allowedIdleMins = expiryConfig[this.deviceType] || 60; 

        if (diffInMinutes < allowedIdleMins) {
            logMessage({ level: 'INFO', message: `Renewing token for User [${this.userID}] Session [${this.sessionID}]` });
            
            const newToken = NE_SessionManager.generateAccessToken(this.tokenPayload, this.deviceType);
            this.currentToken = newToken;
            this.lastUpdatedTime = now;
            
            resolve({ verifyStatus: "NEW TOKEN", token: newToken });
        } else {
            reject(new ApplicationError("Session timed out. Please login again."));
        }
    }

    get token() { return this.currentToken; }
}

module.exports = {
    UserSessions_Helper: NE_SessionManager,
    LoggedInUser: NE_UserSession
};