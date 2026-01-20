"use strict";

const nodemailer = require("nodemailer");
const { NE_Environment } = require('./settings'); 
const { ApplicationError, logMessage } = require('./applicationerror');


const deepClone = (obj) => {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj));
};

class NE_EmailSenderImpl {
    constructor(config) {
        this.senderEmailID = config.senderEmailID;
        this.senderName = config.senderName || this.senderEmailID;

        const mailConfig = { ...config };
        delete mailConfig.senderName;
        delete mailConfig.senderEmailID;
        
        this.transporter = nodemailer.createTransport(mailConfig);
        this.emailTemplates = {};
    }

    setEmailTemplates(templates) {
        Object.entries(templates).forEach(([key, template]) => {
            template.valueKeys = NE_EmailHelper.extractValueKeysFromTemplate(template);
        });
        this.emailTemplates = deepClone(templates);
    }

    async sendEmailToIndividualUsers(templateName, valuesObject, toUsers, ccUsers = [], successCallback = null, failureCallback = null) {
        let targets = toUsers;
        if (typeof toUsers === 'string') {
             targets = { [toUsers]: {} };
        }

        try {
            NE_EmailHelper.validateEmailsObject(targets);
            if (ccUsers && ccUsers.length) NE_EmailHelper.validateEmailsArray(ccUsers);
        } catch (e) {
            if (failureCallback) failureCallback(e);
            return; 
        }
        let template = this.emailTemplates[templateName] || NE_EmailHelper.getDefaultTemplate(templateName);
        
        if (!template) {
            template = {
                emailSubject: templateName,
                emailBody: valuesObject.body || valuesObject.html || "",
                emailFooter: "",
                type: 'standard'
            };
        }

        const responses = {};
        const emailFooter = NE_EmailHelper.formulateMessage(template.emailFooter, valuesObject);

        for (const [email, userData] of Object.entries(targets)) {
            const mergedValues = { ...valuesObject, ...userData };
            
            // Check for missing data
            const missing = NE_EmailHelper.getMissingKeys(template, mergedValues);
            if (missing.length) {
                const msg = `Skipping ${email}: Missing keys ${missing.join(", ")}`;
                console.warn(msg);
                if (failureCallback) failureCallback(new Error(msg));
                continue;
            }

            // Handle Body & Visual OTP
            let tempBody = template.emailBody;
            if (template.type === 'visual_otp') {
                const gridHtml = NE_EmailHelper.createVisualGridHtml(mergedValues.marks);
                tempBody = tempBody.replace('{{visual_otp_grid}}', gridHtml);
            }
            const processedBody = NE_EmailHelper.formulateMessage(tempBody, mergedValues);

            const mailOptions = {
                from: `"${this.senderName}" <${this.senderEmailID}>`,
                to: email,
                cc: ccUsers,
                subject: NE_EmailHelper.formulateMessage(template.emailSubject, mergedValues),
                html: `${processedBody}<br/>${emailFooter}`
            };

            try {
                const info = await this.transporter.sendMail(mailOptions);
                logMessage({ level: "INFO", message: `Email sent to ${email}` });
                responses[email] = info;
                
                // --- SUCCESS CALLBACK ---
                if (successCallback) successCallback(info);

            } catch (err) {
                console.error(`Failed to send email to ${email}:`, err);
                responses[email] = err;

                // --- FAILURE CALLBACK ---
                if (failureCallback) failureCallback(err);
            }
        }
        return responses;
    }
}

const senderRegistry = {};
const defaultEmailTemplates = {};

class NE_EmailHelper {
    static shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static createVisualGridHtml(marks = {}) {
        const baseStyle = 'display:inline-block; width:60px; height:60px; line-height:60px; font-size:24px; font-weight:bold; text-align:center; vertical-align:middle; background-color:#ffffff; margin:5px;';
        const unmarkedStyle = `${baseStyle} color:#888; border:3px solid #e0e0e0; border-radius:12px;`;
        const styles = {
            red:    `${baseStyle} color:#e74c3c; border:4px solid #e74c3c; border-radius:50%;`,
            blue:   `${baseStyle} color:#3498db; border:4px dashed #3498db; border-radius:50%;`,
            green:  `${baseStyle} color:#2ecc71; border:4px dotted #2ecc71; border-radius:50%;`,
            orange: `${baseStyle} color:#e67e22; border:4px double #e67e22; border-radius:50%; box-shadow: 0 0 0 2px #fff inset;`
        };

        const markedNumbers = Object.keys(marks).map(Number);
        const allDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const usedSet = new Set(markedNumbers);
        const freeDigits = allDigits.filter(d => !usedSet.has(d));
        
        const needed = 9 - markedNumbers.length;
        const fillers = this.shuffle(freeDigits).slice(0, needed);
        const gridContent = this.shuffle([...markedNumbers, ...fillers]);

        let html = '<table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto; border-collapse:separate;">';
        for (let i = 0; i < gridContent.length; i += 3) {
            html += '<tr>';
            for (let j = 0; j < 3; j++) {
                const num = gridContent[i + j];
                if (num !== undefined) {
                    const markType = marks[String(num)];
                    const cellStyle = styles[markType] || unmarkedStyle;
                    html += `<td align="center" style="padding:5px;"><div style="${cellStyle}">${num}</div></td>`;
                }
            }
            html += '</tr>';
        }
        html += '</table>';
        return html;
    }

    static setupEmailSender(name = "_", config, templates = {}) {
        const cleanConfig = this.transformSMTPConfig(config);
        const sender = new NE_EmailSenderImpl(cleanConfig);
        if (Object.keys(templates).length) sender.setEmailTemplates(templates);
        senderRegistry[name] = sender;
        return sender;
    }

    static getEmailSender(name = "_") {
        return senderRegistry[name];
    }

    static transformSMTPConfig(input = {}) {
        const user = input.user || NE_Environment.getEnvironmentVariable('EMAIL_USER');
        const pass = input.pass || NE_Environment.getEnvironmentVariable('EMAIL_PASSWORD');
        const host = input.host || NE_Environment.getEnvironmentVariable('EMAIL_HOST');
        const port = input.port || NE_Environment.getEnvironmentVariable('EMAIL_PORT');

        if (!user || !pass || !host) {
             return null;
        }

        return {
            host: host,
            port: port || 587,
            secure: port == 465, 
            auth: { user, pass },
            senderEmailID: input.senderEmailID || NE_Environment.getEnvironmentVariable('EMAIL_FROM') || user,
            senderName: input.senderName || "System"
        };
    }

    static validateEmailsArray(list) {
        const invalid = list.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase()));
        if (invalid.length) throw new Error(`Invalid emails: ${invalid.join(", ")}`);
    }

    static validateEmailsObject(obj) {
        if (typeof obj !== "object" || Array.isArray(obj)) throw new Error("toUsers must be an object { email: {data} }");
        this.validateEmailsArray(Object.keys(obj));
    }

    static formulateMessage(text, values) {
        if (!text) return "";
        return String(text).replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] || "");
    }

    static extractValueKeysFromTemplate(template) {
        return Object.values(template).flatMap(val =>
            typeof val === "string" ? [...val.matchAll(/{{(.*?)}}/g)].map(m => m[1].trim()) : []
        );
    }

    static getMissingKeys(template, valuesObj) {
        if (template.type === 'visual_otp' && (!valuesObj.marks)) return ['marks'];
        const keys = (template.valueKeys || []).filter(k => k !== 'visual_otp_grid');
        return keys.filter(k => valuesObj[k] == null);
    }

    static setDefaultTemplates(templates) {
        Object.entries(templates).forEach(([key, t]) => {
            t.valueKeys = this.extractValueKeysFromTemplate(t);
            defaultEmailTemplates[key] = deepClone(t);
        });
    }

    static getDefaultTemplate(name) {
        return defaultEmailTemplates[name] || null;
    }
}


let defaultInstance = null;

const ensureDefaultInstance = () => {
    if (defaultInstance) return defaultInstance;
    const config = NE_EmailHelper.transformSMTPConfig({});
    if (config) {
        defaultInstance = new NE_EmailSenderImpl(config);
    }
    return defaultInstance;
};

const NE_EmailSender = {
    
    Class: NE_EmailSenderImpl,

   
    sendEmailToIndividualUsers: async (templateName, valuesObject, toUsers, ccUsers, successCallback, failureCallback) => {
        const sender = ensureDefaultInstance();
        if (!sender) {
            const err = new ApplicationError("Email System not initialized. Check EMAIL_HOST/USER/PASSWORD in config.");
            if (failureCallback) failureCallback(err);
            throw err;
        }
        return sender.sendEmailToIndividualUsers(templateName, valuesObject, toUsers, ccUsers, successCallback, failureCallback);
    },

    sendEmail: async (to, subject, body) => {
        const sender = ensureDefaultInstance();
        if (!sender) throw new ApplicationError("Email config missing.");
        
        return sender.sendEmailToIndividualUsers(
            subject, 
            { body },    
            to,
            [] 
        );
    }
};

module.exports = {
    NE_EmailSender,
    NE_EmailHelper
};