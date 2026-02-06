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
const axios = require("axios"); // Added for metadata fetching
const { ApplicationError, logMessage } = require("./applicationerror");
const { NE_Environment } = require("./settings");
const { UserSessions_Helper: NE_SessionManager } = require("./usersession");

const app = express();

/**
 * --- Standard 404 HTML Template ---
 */
// Helper to read HTML templates
const getHtmlTemplate = (filename) => {
  try {
    const filePath = path.join(NE_Environment.ROOT_DIRECTORY, "helpfiles", filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    // Fallback if file missing
    return `<h1>Error ${filename.replace('.html', '')}</h1><p>Template missing.</p>`;
  } catch (e) {
    return `<h1>Error</h1><p>Failed to load template.</p>`;
  }
};


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
    return res.status(404).send(getHtmlTemplate("404.html"));
  }

  // 3. SPA FALLBACK & OG INJECTION
  // Serve index.html so the Frontend Router can take over.
  // We intercept this to inject Dynamic OG Tags.
  const distFolder = NE_Environment.getEnvironmentVariable("DIST_FOLDER_NAME") || "build";
  const indexPath = path.join(NE_Environment.ROOT_DIRECTORY, distFolder, "index.html");

  if (fs.existsSync(indexPath)) {
    // Read the file logic
    fs.readFile(indexPath, 'utf8', async (err, htmlData) => { // Made async
      if (err) {
        logMessage({ level: "ERROR", message: "Failed to read index.html", errorObject: err });
        return res.status(500).send("Error loading application");
      }

      try {
        // Construct the full URL the user is visiting
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        // Infinite Loop Prevention: If the request comes from our own Scraper (HeadlessChrome),
        // serve the raw HTML to allow it to parse the JS and generate the title.
        const userAgent = req.headers['user-agent'] || '';
        if (userAgent.includes("HeadlessChrome") || userAgent.includes("Puppeteer")) {
          return res.send(htmlData);
        }

        // Construct the Dynamic OG Image URL
        const ogImageUrl = `https://og.sherin.fun/og?url=${encodeURIComponent(fullUrl)}`;

        let metadata = { title: "", description: "" };

        try {

          // Fetch Metadata from the OG Service
          // We assume the OG service is running on localhost:3006 (or configured env)
          // Using a short timeout to prevent hanging the response too long
          const metaApiUrl = `http://127.0.0.1:3006/meta?url=${encodeURIComponent(fullUrl)}`;

          // DEBUG LOGGING
          // console.log(`[DEBUG] Fetching metadata for: ${fullUrl}`);
          // console.log(`[DEBUG] Calling OG API: ${metaApiUrl}`);

          const metaResponse = await axios.get(metaApiUrl, { timeout: 10000 }); // Increased timeout
          if (metaResponse.data && !metaResponse.data.error) {
            metadata = metaResponse.data;
          }
        } catch (metaErr) {
          const status = metaErr.response ? metaErr.response.status : 'Unknown';
          console.warn(`[WARN] Metadata fetch failed for ${fullUrl}. Status: ${status}. Error: ${metaErr.message}`);
        }

        let modifiedHtml = htmlData;

        // Function to inject or replace a meta tag
        const updateMetaTag = (property, content) => {
          // Try property= first, then name=
          const regex = new RegExp(`<meta\\s+(?:property|name)=["']${property}["']\\s+content=["'][^"']*["']\\s*/?>`, 'i');
          const newTag = `<meta property="${property}" content="${content}" />`;
          if (regex.test(modifiedHtml)) {
            modifiedHtml = modifiedHtml.replace(regex, newTag);
          } else {
            modifiedHtml = modifiedHtml.replace('</head>', `${newTag}\n</head>`);
          }
        };

        // Inject Image Tags
        updateMetaTag('og:image', ogImageUrl);
        updateMetaTag('twitter:image', ogImageUrl);
        updateMetaTag('og:url', fullUrl);

        // Inject Title & Description if available
        if (metadata.title) {
          // Replace <title>...</title>
          const titleRegex = /<title>(.*?)<\/title>/i;
          if (titleRegex.test(modifiedHtml)) {
            modifiedHtml = modifiedHtml.replace(titleRegex, `<title>${metadata.title}</title>`);
          } else {
            modifiedHtml = modifiedHtml.replace('</head>', `<title>${metadata.title}</title>\n</head>`);
          }
          updateMetaTag('og:title', metadata.title);
          updateMetaTag('twitter:title', metadata.title);
        }

        if (metadata.description) {
          updateMetaTag('description', metadata.description);
          updateMetaTag('og:description', metadata.description);
          updateMetaTag('twitter:description', metadata.description);
        }

        res.send(modifiedHtml);
      } catch (e) {
        logMessage({ level: "ERROR", message: "Error injecting OG tags", errorObject: e });
        res.send(htmlData); // Fallback to raw HTML
      }
    });
  } else {
    // If we can't find index.html, assume the build is missing and show 404
    res.status(404).send(getHtmlTemplate("404.html"));
  }
};

const defaultErrorHandlerMiddleware = (error, req, res, next) => {
  const errorObject = error instanceof ApplicationError
    ? error
    : new ApplicationError(`Internal Server Error`, error);

  logMessage({ level: "ERROR", message: error.message || "Unknown Error", errorObject: error });

  // API Request? Return JSON
  const isApi = req.xhr || req.url.startsWith('/api') || req.headers.accept?.includes('json');
  if (isApi) {
    res.status(500).json(errorObject.getErrorObject());
  } else {
    // Browser Request? Return HTML
    res.status(500).send(getHtmlTemplate("500.html"));
  }
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
    // We set index: false to allow the fallback middleware to handle index.html serving (for OG injection)
    app.use(express.static(path.join(NE_Environment.ROOT_DIRECTORY, distFolder), { index: false }));

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

  static setViewEngine() { }
  static setWebSocketEventHandlers(handlers) { NE_HttpServer.webSocketEventHandlers = handlers; }
}

module.exports = { NE_HttpServer };