"use strict";

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { ApplicationError, logMessage } = require("./applicationerror");

let configSetupObject = {};
let configSequence = [];

try {
    const confModule = require("./configObject");
    configSetupObject = confModule.NE_ConfigSetup || confModule.configSetupObject || {};
    configSequence = confModule.NE_ConfigSequence || [];
} catch (e) {
    console.warn("[WARNING] Could not load configuration definitions (configObject.js). Error:", e.message);
    configSetupObject = {};
}

let NE_Manual = null;
try {
    const manualModule = require("../helpfiles/helpfortopics"); 
    NE_Manual = manualModule.NE_Manual || manualModule; 
} catch (e) {
}

const DIRS_TO_SKIP = new Set([".svn", ".vscode", "node_modules", ".git", "logs", "coverage", "essentials"]);
const SOURCE_EXTENSIONS = new Set([".js", ".ts"]);
const PROJECT_ORG_FILE = "projectOrganization.js";
const ROUTE_DEF_FILE = "routedefinitions.js";

let scannedFiles = [];
let routeDefinitions = [];
let _ProjectRootDir;

const isSourceCodeFile = (fileName) => SOURCE_EXTENSIONS.has(path.extname(fileName));

const prepareArrayFromString = (str) => {
    if (Array.isArray(str)) return str;
    return typeof str === "string" ? str.split(",").map(tk => tk.trim()).filter(Boolean) : [];
};

/**
 * Modernized configuration prompter using Inquirer.
 */
const getDetailsForConfiguration = async (configSetup, curEnvObj = {}) => {
    let tempObject = {};
    const { type, configKey, infoText, question, answers, default: defValue } = configSetup;

    if (infoText) console.log(`\n\x1b[35m--- ${infoText} ---\x1b[0m`);

    if (['keys_group', 'object'].includes(type)) {
        const childConfigs = configSetup[configKey];
        let scopedEnvObj = type === 'object' ? (curEnvObj[configKey] || {}) : curEnvObj;

        for (const childConf of childConfigs) {
            const result = await getDetailsForConfiguration(childConf, scopedEnvObj);
            tempObject = { ...tempObject, ...result };
        }
        return type === 'object' ? { [configKey]: tempObject } : tempObject;
    } 
    
    const currentVal = curEnvObj[configKey] !== undefined ? curEnvObj[configKey] : (defValue !== undefined ? defValue : "");
    
    let promptConfig = {
        name: configKey,
        message: question,
        default: currentVal
    };

    if (answers) {
        promptConfig.type = 'list';
        promptConfig.choices = Object.keys(answers).map(key => ({ name: key, value: answers[key] }));
        // Try to pre-select based on current value
        const found = promptConfig.choices.find(c => c.value === currentVal);
        if (found) promptConfig.default = found.value;
    } else if (type === 'number') {
        promptConfig.type = 'input';
        promptConfig.validate = (val) => {
            if (val === "") return true;
            return !isNaN(val) || "Please enter a valid number";
        };
        promptConfig.filter = (val) => (val === "" || isNaN(val)) ? val : Number(val);
    } else if (type === 'password') {
        promptConfig.type = 'password';
        promptConfig.mask = '*';
    } else if (type === 'string_array') {
        promptConfig.type = 'input';
        promptConfig.message += " (comma separated)";
        promptConfig.filter = (val) => prepareArrayFromString(val);
    } else if (type === 'checkbox') {
        promptConfig.type = 'checkbox';
        promptConfig.choices = configSetup.choices.map(c => ({ name: c, value: c }));
    } else {
        promptConfig.type = 'input';
    }

    const response = await inquirer.prompt([promptConfig]);
    return response;
};

const getConfigurationParamsFromUser = async (envName, envConfObj) => {
    logMessage({ level: "INFO", message: `Preparing configuration for environment: [${envName}]` });

    let envSetupObj = {};

    const runStep = async (stepKey) => {
        if (configSetupObject && configSetupObject[stepKey]) {
            const res = await getDetailsForConfiguration(configSetupObject[stepKey], envConfObj);
            envSetupObj = { ...envSetupObj, ...res };
        }
    };

    if (configSequence.length > 0) {
        for (const stepKey of configSequence) {
             await runStep(stepKey);
        }
    } else {
        // Fallback or explicit sequence
        const resDb = await getDetailsForConfiguration({
            type: 'checkbox',
            configKey: 'DB_TYPE',
            question: 'Select Database Types to enable:',
            choices: ['mysql', 'mongodb', 'mssql'],
            default: envConfObj['DB_TYPE'] || ['mysql']
        });
        envSetupObj['DB_TYPE'] = resDb['DB_TYPE'];

        if (envSetupObj['DB_TYPE'].includes('mongodb')) await runStep('MONGODB_DETAILS');
        if (envSetupObj['DB_TYPE'].includes('mysql')) await runStep('MYSQLDB_DETAILS');
        if (envSetupObj['DB_TYPE'].includes('mssql')) await runStep('MSSQLDB_DETAILS');

        await runStep('APPLICATION_PORT_NUMBER');
        await runStep('SSL_CONNECTION');
        
        if (envSetupObj['SSL_CONNECTION'] === "yes") await runStep('SSL_CERTIFICATE_KEYS');

        await runStep('JWT_TOKEN');
        if (envSetupObj['JWT_TOKEN'] === "yes") {
            if (configSetupObject['JWT_DETAILS']) {
                const res = await getDetailsForConfiguration(configSetupObject['JWT_DETAILS'], envConfObj);
                envSetupObj = { ...envSetupObj, ...res };
            }
        }
    }

    return envSetupObj;
};

const { execSync } = require('child_process');

class NE_Utils {
    static get rootDir() { return process.cwd(); }
    
    static get progFileName() { 
        // 1. Highest Priority: package.json name or main
        if (fs.existsSync('package.json')) {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (pkg.main) return pkg.main;
            if (pkg.name) return `${pkg.name}.js`;
        }
        
        // 2. Fallback: Heuristic search (only if package.json is missing or incomplete)
        if (require.main && require.main.filename) {
            const base = path.basename(require.main.filename);
            if (base !== 'cli.js' && base !== 'index.js') return base;
        }

        const files = fs.readdirSync(process.cwd());
        const entryFile = files.find(f => f.endsWith('.js') && !['projectOrganization.js', 'package.json', 'cli.js'].includes(f));
        return entryFile || 'backend.js';
    }

    static get configFile() { 
        // Deterministic config name based on main entry
        const name = path.basename(this.progFileName, path.extname(this.progFileName));
        return `${name}.conf`; 
    }

    static getCommandLineArguments() {
        const clArgs = {};
        process.argv.forEach((arg, index) => {
            if (arg.startsWith("--")) {
                clArgs[arg.replace("--", "")] = process.argv[index + 1] || "";
            }
        });
        return clArgs;
    }

    static async processCli() {
        const args = process.argv.slice(2);
        
        if (args.includes('setup') || args.includes('--projectsetup') || args.length === 0) {
            console.log('\n\x1b[36m========== NEX FRAMEWORK CLI ==========\x1b[0m\n');
            
            const answers = await inquirer.prompt([
                {
                   type: 'list',
                   name: 'action',
                   message: 'What would you like to do?',
                   choices: [
                       { name: '🚀 Scaffold Project Architecture (Full Bootstrap)', value: 'scaffold' },
                       { name: '⚙️  Configure/Update Environment (.conf)', value: 'configure' },
                       { name: '📁 Sync Project Structure (Routes mapping)', value: 'sync' },
                       { name: '📚 View Help & Documentation', value: 'help' },
                       { name: '❌ Exit', value: 'exit' }
                   ]
                }
            ]);

            if (answers.action === 'scaffold') {
                 await NE_Utils.projectSetup();
                 const { goConfig } = await inquirer.prompt([{ type: 'confirm', name: 'goConfig', message: 'Configure local environment now?', default: true }]);
                 if (goConfig) await NE_Utils.configureEnvironment('Local');
                 
                 console.log('\n\x1b[32m✔ Project scaffolded beautifully!\x1b[0m');
                 const { startServer } = await inquirer.prompt([{ type: 'confirm', name: 'startServer', message: 'Would you like to start the development server now?', default: true }]);
                 if (startServer) {
                     console.log('\x1b[36m🚀 Launching Nex Development Server...\x1b[0m\n');
                     // Cleanly hand over control to the dev server
                     execSync('npm run dev', { stdio: 'inherit' });
                     process.exit(0); 
                 }
            } else if (answers.action === 'configure') {
                 const { env } = await inquirer.prompt([
                     { type: 'input', name: 'env', message: 'Enter environment name:', default: 'Local' }
                 ]);
                 await NE_Utils.configureEnvironment(env);
             } else if (answers.action === 'sync') {
                 NE_Utils.updateProjectStructure();
             } else if (answers.action === 'help') {
                 if (NE_Manual && typeof NE_Manual.showInteractiveHelp === 'function') {
                     await NE_Manual.showInteractiveHelp();
                 } else {
                     console.log("\n\x1b[33mOops! The Help module isn't loaded properly.\x1b[0m\n");
                 }
            }
            if (answers.action !== 'exit') await NE_Utils.processCli();
            else process.exit(0);

        } else if (args.includes('configure') || args.includes('--configure')) {
            const envIdx = args.indexOf('configure') !== -1 ? args.indexOf('configure') + 1 : args.indexOf('--configure') + 1;
            await NE_Utils.configureEnvironment(args[envIdx] || 'Local');
            process.exit(0);
        } else if (args.includes('projectstructure') || args.includes('--projectstructure')) {
            NE_Utils.updateProjectStructure();
            process.exit(0);
        }

        return NE_Utils.getCommandLineArguments();
    }

    static async projectSetup() {
        try {
            console.log("\n\x1b[36m--- Starting Project Scaffolding ---\x1b[0m");

            const defaultName = path.basename(process.cwd());
            const { projectName } = await inquirer.prompt([
                { type: 'input', name: 'projectName', message: 'Enter project name:', default: defaultName }
            ]);

            // 1. NPM Init
            if (!fs.existsSync('package.json')) {
                console.log("\x1b[32m✔ Initializing npm project...\x1b[0m");
                execSync('npm init -y', { stdio: 'ignore' });
            }

            // 2. Install Dependencies
            console.log("\x1b[32m✔ Installing dependencies (express, nodemon)... Please wait.\x1b[0m");
            try {
                execSync('npm install express', { stdio: 'ignore' });
                execSync('npm install --save-dev nodemon', { stdio: 'ignore' });
            } catch (e) {
                console.warn("\x1b[33mWarning: Dependency installation failed. Please run 'npm install express' manually.\x1b[0m");
            }

            // 3. Update package.json scripts
            let pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const entryFile = `${projectName}.js`;
            pkgJson.main = entryFile;
            pkgJson.scripts = pkgJson.scripts || {};
            pkgJson.scripts.start = `node ${entryFile}`;
            pkgJson.scripts.dev = `nodemon ${entryFile}`;
            pkgJson.scripts.setup = `sv-nex setup`;
            pkgJson.scripts.configure = `sv-nex configure`;
            pkgJson.scripts.sync = `sv-nex projectstructure`;
            fs.writeFileSync('package.json', JSON.stringify(pkgJson, null, 2));

            // 4. Create Folders
            const folders = ["routes", "controllers"];
            folders.forEach(f => {
                if (!fs.existsSync(f)) {
                    fs.mkdirSync(f);
                    console.log(`\x1b[32m✔ Folder created: ${f}/\x1b[0m`);
                }
            });

            // 5. Create Entry File
            if (!fs.existsSync(entryFile)) {
                const indexJs = `// Auto‑generated by Nex CLI\nconst { Implementation_Manager } = require('sv-nex');\nconst pingModule = require('./routes/ping');\n\n(async () => {\n    try {\n        await Implementation_Manager.initializeImplementation();\n        Implementation_Manager.initializeHttpAndStartServer({ ping: pingModule });\n    } catch (e) {\n        console.error('Startup error:', e);\n        process.exit(1);\n    }\n})();\n`;
                fs.writeFileSync(entryFile, indexJs);
                console.log(`\x1b[32m✔ Entry file created: ${entryFile}\x1b[0m`);
            }

            // 6. Create Sample Route
            const pingPath = path.join('routes', 'ping.js');
            if (!fs.existsSync(pingPath)) {
                const pingJs = `const express = require('express');\nconst router = express.Router();\n\n/** @route GET /ping */\nrouter.get('/ping', (req, res) => {\n    res.json({ status: 'ok', timestamp: new Date(), message: 'Server is running beautiful!' });\n});\n\nmodule.exports = { router };\n`;
                fs.writeFileSync(pingPath, pingJs);
                console.log(`\x1b[32m✔ Sample route created: ${pingPath}\x1b[0m`);
            }

            // 7. Initialize Framework Files
            const projectOrgFile = path.join(NE_Utils.rootDir, PROJECT_ORG_FILE);
            const configFile = path.join(NE_Utils.rootDir, `${projectName}.conf`);

            if (!fs.existsSync(projectOrgFile)) fs.writeFileSync(projectOrgFile, `const __projectStructure = [];\r\nmodule.exports = { __projectStructure };`);
            if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({ Local: {}, Stage: {} }, null, 2));

            console.log("\x1b[32m✔ Infrastructure verification completed.\x1b[0m\n");
        } catch (err) {
            throw new ApplicationError("Project Setup Failed", err);
        }
    }

    static loadConfig(configFilePath) {
        if (!fs.existsSync(configFilePath)) throw new ApplicationError(`Configuration file not found: ${configFilePath}`);
        try {
            const fileContent = fs.readFileSync(configFilePath, "UTF-8");
            const cleanJson = fileContent.split('\n').map(line => line.split('###')[0]).join('').trim();
            return cleanJson ? JSON.parse(cleanJson) : {};
        } catch (err) {
            throw new ApplicationError("Error parsing configuration file.", err);
        }
    }

    static async configureEnvironment(envName) {
        if (!envName) envName = "Local";

        const configFile = path.join(NE_Utils.rootDir, NE_Utils.configFile);
        const configObject = fs.existsSync(configFile) ? NE_Utils.loadConfig(configFile) : {};
        
        console.log(`\n\x1b[36m--- Configuring Environment: ${envName} ---\x1b[0m`);
        const userProvidedConfObj = await getConfigurationParamsFromUser(envName, configObject[envName] || {});
        
        configObject[envName] = userProvidedConfObj;
        fs.writeFileSync(configFile, JSON.stringify(configObject, null, 2));

        console.log(`\x1b[32m✔ Configuration for [${envName}] saved to ${NE_Utils.configFile}\x1b[0m\n`);
    }

    static updateProjectStructure() {
        buildProjectOrgFile(NE_Utils.rootDir);
    }
}

const processFiles = (currentPath) => {
    try {
        const dirContents = fs.readdirSync(currentPath);
        const isRoutesDir = path.basename(currentPath) === "routes";

        for (const item of dirContents) {
            const fullPath = path.join(currentPath, item);
            if (item.startsWith('.')) continue;

            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (DIRS_TO_SKIP.has(item)) continue;
                processFiles(fullPath); 
            } else {
                if (isSourceCodeFile(fullPath)) {
                    scannedFiles.push(item);
                    if (isRoutesDir) {
                        const routeName = path.basename(item, path.extname(item));
                        const relativePath = `./${path.relative(_ProjectRootDir, fullPath).replace(/\\/g, "/")}`;
                        routeDefinitions.push({ routeName, routePath: relativePath });
                    }
                }
            }
        }
    } catch (err) {
        throw new ApplicationError(`Error processing directory ${currentPath}`, err);
    }
};

const buildProjectOrgFile = (projectRootDirectory) => {
    try {
        _ProjectRootDir = projectRootDirectory;
        scannedFiles = [];
        routeDefinitions = [];

        processFiles(projectRootDirectory);

        const routeImports = routeDefinitions.map(r => `const ${r.routeName} = require('${r.routePath}');`).join('\r\n');
        const routeExports = routeDefinitions.map(r => `    ${r.routeName}`).join(',\r\n');
        
        const routeFileContent = `/** Auto-generated Route Definitions */\r\n\r\n${routeImports}\r\n\r\nmodule.exports = {\r\n    routes: {\r\n${routeExports}\r\n    }\r\n};\r\n`;

        const structureContent = `/** Auto-generated Project Map */\r\n\r\nconst __projectStructure = [\r\n` + 
            scannedFiles.map((f, i) => `    '${f}'${i < scannedFiles.length - 1 ? ',' : ''} // ${i + 1}`).join('\r\n') +
            `\r\n];\r\n\r\nmodule.exports = { __projectStructure };\r\n`;

        fs.writeFileSync(path.join(projectRootDirectory, PROJECT_ORG_FILE), structureContent);
        if (routeDefinitions.length > 0) {
            if (!fs.existsSync(path.join(projectRootDirectory, 'routes'))) fs.mkdirSync(path.join(projectRootDirectory, 'routes'));
            fs.writeFileSync(path.join(projectRootDirectory, "routes", ROUTE_DEF_FILE), routeFileContent);
        }

        logMessage({ level: "SUCCESS", message: "Structure sync completed." });
    } catch (err) {
        throw new ApplicationError("Error building project organization files", err);
    }
};

module.exports = { NE_Utils };