"use strict";

const inquirer = require('inquirer');

// --- ANSI Color Codes for Terminal Styling ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    bgBlue: "\x1b[44m"
};

// --- Documentation Content ---
const topics = {
    setup: {
        title: "📂 CLI Commands (Setup & Config)",
        content: `
${C.bold}${C.bgBlue} 📂 CLI COMMANDS & SETUP ${C.reset}

${C.yellow}1. Project Initialization${C.reset}
   ${C.green}node index.js --projectsetup${C.reset}
   - Creates the 'routes' folder.
   - Generates 'projectOrganization.js' (assigns IDs to files).
   - Ensures base configuration files exist.

${C.yellow}2. Configuration${C.reset}
   ${C.green}node index.js --configure Local${C.reset}
   - Interactive wizard to set DB credentials, Ports, and Keys.
   - Saves to 'Local.conf'.
   
${C.yellow}3. Structure Indexing${C.reset}
   ${C.green}node index.js --projectstructure${C.reset}
   - Scans your project for new files.
   - Assigns unique Error IDs (e.g., F005) to them.
   - ${C.red}Run this whenever you add a new file!${C.reset}
`
    },

    architecture: {
        title: "🏗️  Architecture Overview",
        content: `
${C.bold}${C.bgBlue} 🏗️  PROJECT ARCHITECTURE ${C.reset}

${C.cyan}1. Entry Point (index.js)${C.reset}
   - Initializes Environment (Local/Prod).
   - Calls ${C.yellow}NE_AppManager.initializeImplementation()${C.reset}.

${C.cyan}2. Essentials (Core Library)${C.reset}
   - ${C.bold}NE_HttpServer:${C.reset} Express wrapper, handles JWT & Middleware.
   - ${C.bold}NE_Environment:${C.reset} Loads settings from .conf files.
   - ${C.bold}DB Helpers:${C.reset} Manages connections (MySQL, Mongo, MSSQL).

${C.cyan}3. Routes (routes/)${C.reset}
   - Define API endpoints here.
   - Maps URL paths to Controller functions.

${C.cyan}4. Controllers${C.reset}
   - Contains business logic.
   - Returns JSON data or throws ${C.red}ApplicationError${C.reset}.
`
    },

    database: {
        title: "💾 Database Usage (MySQL/Mongo)",
        content: `
${C.bold}${C.bgBlue} 💾 DATABASE HELPERS ${C.reset}

${C.yellow}MySQL Example:${C.reset}
  ${C.gray}const { MySQLDB_Helper } = require('../essentials/mysqldb_helper');${C.reset}
  
  // Execute Query
  ${C.green}const users = await MySQLDB_Helper.executeQuery(
      "SELECT * FROM users WHERE active = ?", 
      [1]
  );${C.reset}

  // Transaction
  ${C.green}await MySQLDB_Helper.executeTransaction([
      { sql: "INSERT INTO logs ...", params: [...] },
      { sql: "UPDATE users ...", params: [...] }
  ]);${C.reset}

${C.yellow}MongoDB Example:${C.reset}
  ${C.gray}const { MongoDB_Helper } = require('../essentials/mongodb_helper');${C.reset}
  
  // Find
  ${C.green}const docs = await MongoDB_Helper.findRecords('users', { age: { $gt: 18 } });${C.reset}
  
  // Insert
  ${C.green}await MongoDB_Helper.insertRecords('logs', { action: 'login', time: new Date() });${C.reset}
`
    },

    uploads: {
        title: "📤 File Uploads",
        content: `
${C.bold}${C.bgBlue} 📤 FILE UPLOAD SYSTEM ${C.reset}

To handle uploads, register a handler in your controller or route file:

${C.gray}const { UploadHelper } = require('../essentials/upload_helper');${C.reset}

// 1. Define the Handler
${C.green}new UploadHelper('profile_pic', 'uploadUserAvatar', 'image', {
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    maxFileSize: 2 * 1024 * 1024 // 2MB
});${C.reset}

// 2. Use Middleware in Route
${C.cyan}router.post('/upload/:id', UploadHelper.uploadMiddleware, (req, res) => {
    // File is moved and ready
    const fileInfo = req.body.criteria.uploadedFileDetails;
    res.json(fileInfo);
});${C.reset}

${C.yellow}Note:${C.reset} The ':id' in the route must match the API Name defined in step 1.
`
    },

    errors: {
        title: "⚠️ Error Handling Standard",
        content: `
${C.bold}${C.bgBlue} ⚠️ ERROR HANDLING STANDARD ${C.reset}

${C.red}DO NOT${C.reset} throw generic Errors. Use ${C.bold}ApplicationError${C.reset}.

${C.yellow}Correct Usage:${C.reset}
  ${C.gray}const { ApplicationError } = require('../essentials/applicationerror');${C.reset}

  try {
      // ... logic
  } catch (err) {
      // Wraps the error and adds location info automatically
      throw new ApplicationError("Failed to process user data", err);
  }

${C.cyan}Why?${C.reset}
  - It automatically logs the File ID and Line Number.
  - It ensures the API returns a standardized JSON error response.
`
    }
};

class NE_Manual {
    static async showInteractiveHelp() {
        console.clear();
        console.log(`\n${C.bgBlue}${C.bold}  DEVELOPER KNOWLEDGE BASE  ${C.reset} ${C.gray}Select a topic to learn${C.reset}\n`);

        const choices = Object.keys(topics).map(key => ({
            name: topics[key].title,
            value: key
        }));

        choices.push(new inquirer.Separator());
        choices.push({ name: `${C.red}❌ Exit${C.reset}`, value: 'EXIT' });

        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'topic',
                message: 'What would you like to learn about?',
                choices: choices,
                pageSize: 12
            }
        ]);

        if (answer.topic === 'EXIT') {
            console.log(`${C.green}Happy Coding! 🚀${C.reset}`);
            process.exit(0);
        }

        // Display Content
        const t = topics[answer.topic];
        console.log(`\n${C.gray}──────────────────────────────────────────────────────────────${C.reset}`);
        console.log(t.content);
        console.log(`${C.gray}──────────────────────────────────────────────────────────────${C.reset}\n`);

        // Navigation Loop
        const next = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'Navigation:',
            choices: [
                { name: '🔙 Back to Menu', value: 'BACK' },
                { name: '❌ Exit', value: 'EXIT' }
            ]
        }]);

        if (next.action === 'BACK') {
            await NE_Manual.showInteractiveHelp();
        } else {
            console.log(`${C.green}Happy Coding! 🚀${C.reset}`);
            process.exit(0);
        }
    }
}

module.exports = { NE_Manual };