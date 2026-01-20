"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const { ApplicationError, logMessage } = require("./applicationerror");
const { NE_Environment } = require("./settings");
const { UserSessions_Helper: NE_SessionManager } = require("./usersession"); 

const app = express();

/**
 * --- Standard 404 HTML Template ---
 */
const get404Html = (url) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f8; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; width: 90%; }
        h1 { font-size: 80px; margin: 0; color: #e74c3c; }
        p { color: #666; margin-bottom: 30px; }
        .btn { text-decoration: none; background: #3498db; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; }
        .btn:hover { background: #2980b9; }
        .path { background: #eee; padding: 2px 6px; border-radius: 4px; color: #c0392b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The requested URL <span class="path">${url}</span> was not found.</p>
        <a href="/" class="btn">Go Home</a>
    </div>
</body>
</html>
`;


const defaultApiNotFoundMiddleware = (req, res, next) => {
  const isApi = req.xhr || req.url.startsWith('/api') || req.headers.accept?.includes('json');

  if (isApi) {
      return res.status(404).json({
          status: "Error",
          message: `Endpoint not found: ${req.url}`,
          code: 404
      });
  }
  const isStaticFile = req.url.split('/').pop().includes('.');
  
  if (isStaticFile) {
      return res.status(404).send(get404Html(req.url));
  }

  // 3. SPA FALLBACK (User trying to access /home, /dashboard directly)
  // Serve index.html so the Frontend Router can take over and check the session.
  const distFolder = NE_Environment.getEnvironmentVariable("DIST_FOLDER_NAME") || "build";
  const indexPath = path.join(NE_Environment.ROOT_DIRECTORY, distFolder, "index.html");

  if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
  } else {
      // If we can't find index.html, assume the build is missing and show 404
      res.status(404).send(get404Html(req.url));
  }
};

const defaultErrorHandlerMiddleware = (error, req, res, next) => {
  const errorObject = error instanceof ApplicationError 
    ? error 
    : new ApplicationError(`Internal Server Error`, error);

  logMessage({ level: "ERROR", message: error.message || "Unknown Error", errorObject: error });
  
  res.status(500).json(errorObject.getErrorObject());
};

class NE_HttpServer {
  static httpserver;
  static io;
  
  static ApiNotFoundHandler = defaultApiNotFoundMiddleware;
  static ApiErrorHandler = defaultErrorHandlerMiddleware;
  static webSocketEventHandlers = {};

  static setMiddleware() {
    app.use(cors());
    app.use(compression());
    app.use(bodyParser.json({ limit: "50mb" }));
    app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

    const distFolder = NE_Environment.getEnvironmentVariable("DIST_FOLDER_NAME") || "build";
    app.use(express.static(path.join(NE_Environment.ROOT_DIRECTORY, distFolder)));

    if (NE_Environment.UPLOAD_DIRECTORY) {
        app.use("/uploads", express.static(NE_Environment.UPLOAD_DIRECTORY));
    }
    app.use(async (req, res, next) => {
        await NE_HttpServer.handleAuthMiddleware(req, res, next);
    });
  }

 
  static async handleAuthMiddleware(req, res, next) {
    try {
        const useJwt = NE_Environment.getEnvironmentVariable("JWT_TOKEN") === "yes";
        if (!useJwt) return next();

        const noTokenApisStr = NE_Environment.getEnvironmentVariable("NO_TOKEN_APIS") || "";
        const noTokenApis = noTokenApisStr.split(',').map(s => s.trim());
        const isPublicApi = noTokenApis.some(api => req.url.includes(api));

        if (!isPublicApi) {
            const authHeader = req.headers['authorization'];
            const authFor = req.headers['authfor'] || 'User';

            const response = await NE_SessionManager.validateToken(authFor, authHeader);
            const { verifyStatus, token, additionalParams } = response;

            if (req.method === "GET") {
                const criteria = req.query.criteria ? JSON.parse(req.query.criteria) : {};
                req.query.criteria = JSON.stringify({ ...criteria, ...additionalParams });
            } else {
                req.body.criteria = req.body.criteria || {};
                Object.assign(req.body.criteria, additionalParams);
            }

            if (verifyStatus === "NEW_TOKEN") res.setHeader("ntk", token);
        }
        next();
    } catch (err) {
        res.status(401).json({ status: "Error", message: err.message || "Unauthorized" });
    }
  }

  static setRoutes(routes) {
    if (!routes) return;
    try {
      Object.entries(routes).forEach(([routeName, routeModule]) => {
          if (routeModule && routeModule.router) {
            app.use(`/${routeName}`, routeModule.router);
            logMessage({ level: "INFO", message: `Route registered: /${routeName}` });
          }
      });
    } catch (err) {
      throw new ApplicationError("Failed to register routes", err);
    }
  }

  static startServer() {
    const port = NE_Environment.APPLICATION_PORT_NUMBER || 3000;
    const isSSL = NE_Environment.getEnvironmentVariable("SSL_CONNECTION") === "yes";

    if (isSSL) {
        const keyPath = path.join(NE_Environment.ROOT_DIRECTORY, NE_Environment.getEnvironmentVariable("SSL_PRIVATEKEY_FILE_PATH"));
        const certPath = path.join(NE_Environment.ROOT_DIRECTORY, NE_Environment.getEnvironmentVariable("SSL_CERTIFICATE_FILE_PATH"));
        const options = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
        NE_HttpServer.httpserver = https.createServer(options, app);
    } else {
        NE_HttpServer.httpserver = http.createServer(app);
    }

    NE_HttpServer.io = socketIo(NE_HttpServer.httpserver);
    NE_HttpServer.io.on('connection', (socket) => {
        Object.entries(NE_HttpServer.webSocketEventHandlers).forEach(([event, handler]) => {
            socket.on(event, (data) => handler(socket, data));
        });
    });

    NE_HttpServer.httpserver.listen(port, () => {
        logMessage({ level: "SUCCESS", message: `Server listening on port [${port}]` });
    });
  }


  static initializeAndStartHttpService(routes) {
    try {
      NE_HttpServer.setMiddleware();
      NE_HttpServer.setRoutes(routes);
      
      // ERROR HANDLERS (Must be attached last!)
      app.use(NE_HttpServer.ApiNotFoundHandler);
      app.use(NE_HttpServer.ApiErrorHandler);

      NE_HttpServer.startServer();
    } catch (err) {
      throw new ApplicationError("Critical: Failed to start HTTP Service", err);
    }
  }

  static setViewEngine() {}
  static setWebSocketEventHandlers(handlers) { NE_HttpServer.webSocketEventHandlers = handlers; }
}

module.exports = { NE_HttpServer };