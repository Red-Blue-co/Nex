"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ApplicationError, logMessage } = require("./applicationerror");
let configSetupObject = {};
let configSequence = [];

try {
    const confModule = require("./configObject");
    configSetupObject = confModule.NE_ConfigSetup || confModule.configSetupObject || {};
    configSequence = confModule.NE_ConfigSequence || [];
} catch (e) {
    console.warn("[WARNING] Could not load configuration definitions (ne_configobject.js).");
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

const readUserInputFromTerminal = (rl, question) => {
    return new Promise(resolve => rl.question(question, resolve));
};


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

        if (!fs.existsSync(projectRootDirectory) || !fs.statSync(projectRootDirectory).isDirectory()) {
            throw new ApplicationError("Invalid Project Root Directory.");
        }

        scannedFiles = [];
        routeDefinitions = [];

        processFiles(projectRootDirectory);

        if (!fs.existsSync(path.join(projectRootDirectory, 'routes'))) {
             fs.mkdirSync(path.join(projectRootDirectory, 'routes'));
        }

        const routeImports = routeDefinitions.map(r => `const ${r.routeName} = require('${r.routePath}');`).join('\r\n');
        const routeExports = routeDefinitions.map(r => `    ${r.routeName}`).join(',\r\n');
        
        const routeFileContent = `/** Auto-generated Route Definitions */\r\n\r\n${routeImports}\r\n\r\nmodule.exports = {\r\n    routes: {\r\n${routeExports}\r\n    }\r\n};\r\n`;

        const structureContent = `/** Auto-generated Project Map */\r\n\r\nconst __projectStructure = [\r\n` + 
            scannedFiles.map((f, i) => `    '${f}'${i < scannedFiles.length - 1 ? ',' : ''} // ${i + 1}`).join('\r\n') +
            `\r\n];\r\n\r\nmodule.exports = { __projectStructure };\r\n`;

        fs.writeFileSync(path.join(projectRootDirectory, PROJECT_ORG_FILE), structureContent);
        fs.writeFileSync(path.join(projectRootDirectory, "routes", ROUTE_DEF_FILE), routeFileContent);

        logMessage({ level: "SUCCESS", message: "Project organization files built successfully." });

    } catch (err) {
        throw new ApplicationError("Error building project organization files", err);
    }
};


const getDetailsForConfiguration = async (rl, configSetup, curEnvObj = {}) => {
    let tempObject = {};
    const { type, configKey, infoText, question, answers } = configSetup;

    if (infoText) console.log(`\n--- ${infoText} ---`);

    if (['keys_group', 'object'].includes(type)) {
        const childConfigs = configSetup[configKey];
        let scopedEnvObj = type === 'object' ? (curEnvObj[configKey] || {}) : curEnvObj;

        for (const childConf of childConfigs) {
            const result = await getDetailsForConfiguration(rl, childConf, scopedEnvObj);
            tempObject = { ...tempObject, ...result };
        }
        return type === 'object' ? { [configKey]: tempObject } : tempObject;
    } 
    
    const currentVal = curEnvObj[configKey] || "";
    const questionStr = `${question} ${currentVal ? `[${currentVal}]` : ''}: `;
    
    let finalValue = null;

    while (finalValue === null) {
        let answer = await readUserInputFromTerminal(rl, questionStr);
        if (answer === "" && currentVal) answer = currentVal;

        if (answers) {
            if (answers[answer] !== undefined) {
                finalValue = answers[answer];
            } else {
                console.log(`Invalid option. Allowed: ${Object.keys(answers).join(", ")}`);
            }
        } else {
            finalValue = answer;
        }
    }

    if (type === 'number' && !isNaN(finalValue)) finalValue = +finalValue;
    if (type === 'string_array') finalValue = prepareArrayFromString(finalValue);
    
    return { [configKey]: finalValue };
};

const getConfigurationParamsFromUser = async (envName, envConfObj) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    logMessage({ level: "INFO", message: `Preparing configuration for environment: [${envName}]` });

    let envSetupObj = {};

    const runStep = async (stepKey) => {
        if (configSetupObject && configSetupObject[stepKey]) {
            const res = await getDetailsForConfiguration(rl, configSetupObject[stepKey], envConfObj);
            envSetupObj = { ...envSetupObj, ...res };
        }
    };
    if (configSequence.length > 0) {
        for (const stepKey of configSequence) {
             await runStep(stepKey);
        }
    } else {
        await runStep('DB_TYPE');

        const dbTypes = envSetupObj['DB_TYPE'] || [];
        if (dbTypes.includes('mongodb')) await runStep('MONGODB_DETAILS');
        if (dbTypes.includes('mysql')) await runStep('MYSQLDB_DETAILS');
        if (dbTypes.includes('mssql')) await runStep('MSSQLDB_DETAILS');

        const standardKeys = ['APPLICATION_PORT_NUMBER', 'SSL_CONNECTION', 'JWT_TOKEN'];
        for (const key of standardKeys) {
            await runStep(key);
        }

        if (envSetupObj['SSL_CONNECTION'] === "yes") await runStep('SSL_CERTIFICATE_KEYS');

        if (envSetupObj['JWT_TOKEN'] === "yes") {
            if (configSetupObject['JWT_DETAILS']) {
                const res = await getDetailsForConfiguration(rl, configSetupObject['JWT_DETAILS'], envConfObj);
                if (res['NO_TOKEN_APIS']) res['NO_TOKEN_APIS'] = prepareArrayFromString(res['NO_TOKEN_APIS']);
                if (res['REQUEST_PARAMS_FROM_TOKEN']) res['REQUEST_PARAMS_FROM_TOKEN'] = prepareArrayFromString(res['REQUEST_PARAMS_FROM_TOKEN']);
                envSetupObj = { ...envSetupObj, ...res };
            }
        }
    }

    rl.close();
    return envSetupObj;
};

class NE_Utils {
    static get rootDir() { return process.cwd(); }
    static get progFileName() { return path.basename(require.main ? require.main.filename : __filename); }
    static get configFile() { return `${path.basename(this.progFileName, path.extname(this.progFileName))}.conf`; }

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
        const inquirer = require('inquirer');
        const args = process.argv.slice(2);
        
        // Intercept standard `--projectsetup` or the new `setup` string for our wizard!
        if (args.includes('setup') || args.includes('--projectsetup')) {
            console.log('\nNex CLI Setup\n');
            
            const answers = await inquirer.prompt([
                {
                   type: 'list',
                   name: 'action',
                   message: 'What would you like to initialize?',
                   choices: [
                       '🚀 Scaffold Project Architecture (Routes & Settings)',
                       '⚙️  Configure Database Environment (.conf)',
                       '📚 Help & Documentation',
                       '❌ Exit'
                   ]
                }
            ]);

            if (answers.action.includes('Scaffold Project Architecture')) {
                 console.log("\n\x1b[32m✔ Initializing Backend Infrastructure...\x1b[0m");
                 NE_Utils.projectSetup("");
                 console.log("\x1b[32m✔ Setup complete! Run `npx nex setup` again to configure your DB!\x1b[0m");
            } else if (answers.action.includes('Configure Database Environment')) {
                 // Prompt for environment name, default to 'Local'
                 const { env } = await inquirer.prompt([
                     {
                         type: 'input',
                         name: 'env',
                         message: 'Enter environment name (default: Local):',
                         default: 'Local'
                     }
                 ]);
                 await NE_Utils.configureEnvironment(env);
             } else if (answers.action.includes('Help')) {
                 if (NE_Manual && typeof NE_Manual.showInteractiveHelp === 'function') {
                     await NE_Manual.showInteractiveHelp();
                 } else {
                     console.log("\n\x1b[33mOops! The Help module isn't loaded properly.\x1b[0m\n");
                 }
            }
            process.exit(0);

        } else if (args.includes('configure') || args.includes('--configure')) {
            await NE_Utils.configureEnvironment(args[args.indexOf('configure') + 1]);
            process.exit(0);
        } else if (args.includes('projectstructure') || args.includes('--projectstructure')) {
            NE_Utils.updateProjectStructure();
            process.exit(0);
        }

        return NE_Utils.getCommandLineArguments();
    }

    static projectSetup(psArg) {
        try {
            if (psArg !== "") throw new ApplicationError("The --projectsetup option does not accept parameters.");

            const routesFolder = path.join(NE_Utils.rootDir, "routes");
            const projectOrgFile = path.join(NE_Utils.rootDir, PROJECT_ORG_FILE);
            const configFile = path.join(NE_Utils.rootDir, NE_Utils.configFile);

            if (!fs.existsSync(routesFolder)) fs.mkdirSync(routesFolder);
            if (!fs.existsSync(projectOrgFile)) fs.writeFileSync(projectOrgFile, `const __projectStructure = [];\r\nmodule.exports = { __projectStructure };`);
            if (!fs.existsSync(configFile)) {
                const template = `\n### Use --configure <environment> to create configuration.\n{\n  "Local": {},\n  "Stage": {}\n}`;
                fs.writeFileSync(configFile, template);
            }

            logMessage({ level: "SUCCESS", message: "Project setup verification completed." });
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
        if (!envName) {
            envName = process.env["NE_ENV"] || "Local";
        }
        if (!envName) throw new ApplicationError("Environment name not specified. Use --configure <name> or set NE_ENV.");

        const configFile = path.join(NE_Utils.rootDir, NE_Utils.configFile);
        const configObject = fs.existsSync(configFile) ? NE_Utils.loadConfig(configFile) : {};
        
        const userProvidedConfObj = await getConfigurationParamsFromUser(envName, configObject[envName] || {});
        
        configObject[envName] = userProvidedConfObj;
        fs.writeFileSync(configFile, JSON.stringify(configObject, null, 2));

        logMessage({ level: "SUCCESS", message: "Configuration updated successfully." });
    }

    static updateProjectStructure() {
        buildProjectOrgFile(NE_Utils.rootDir);
    }
}

module.exports = { NE_Utils };