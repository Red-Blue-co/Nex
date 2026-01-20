"use strict";

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { ApplicationError, logMessage } = require('./applicationerror');
const { NE_Environment } = require('./settings');

const uploadHandlers = {};

/**
 * --- Multer Configuration Helpers ---
 */

const getUploadDir = (type) => {
    // Base upload directory from config
    const baseDir = NE_Environment.UPLOAD_DIRECTORY || path.join(NE_Environment.ROOT_DIRECTORY, 'uploads');

    const tempDir = path.join(baseDir, 'temp', type || 'general');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
};

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!req.uploadDetails?.uploadType) {
                return cb(new Error("Upload type missing."));
            }
            const folder = getUploadDir(req.uploadDetails.uploadType);
            cb(null, folder);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `tmp-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    try {
        const type = req.uploadDetails?.uploadType;
        const handler = NE_UploadHelper.getHandler(type);

        if (!handler) return cb(new Error("Invalid upload configuration."));


        if (handler.allowedMimeTypes.length > 0 && !handler.allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${handler.allowedMimeTypes.join(', ')}`));
        }
        cb(null, true);
    } catch (err) {
        cb(err);
    }
};

const multerInstance = multer({
    storage: storageEngine,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});


class NE_UploadHelper {

    constructor(uploadType, apiName, fieldName = "file", options = {}) {
        this.uploadType = uploadType;
        this.apiName = apiName; 
        this.fieldName = fieldName;

        // Options
        this.allowedMimeTypes = options.allowedMimeTypes || [];
        this.maxFileSize = options.maxFileSize || (5 * 1024 * 1024); // Default 5MB
        this.folderNameCreator = options.folderNameCreator || null;
        this.fileNameCreator = options.fileNameCreator || null;

        uploadHandlers[apiName] = this;
    }

    static getHandler(apiName) {
        return uploadHandlers[apiName];
    }
    static initializeUploadHandlers(definitions) {
        Object.keys(definitions).forEach((key) => {
            const def = definitions[key];
            if (def) {
                new NE_UploadHelper(
                    key,
                    def.apiName || key,
                    def.fieldName,
                    { ...def.uploadOptions, folderNameCreator: def.folderNameCreator, fileNameCreator: def.fileNameCreator }
                );
            }
        });
    }

    static async uploadMiddleware(req, res, next) {
        try {
            const apiName = req.params.id; // Expecting route /:id
            const handler = NE_UploadHelper.getHandler(apiName);

            if (!handler) {
                throw new ApplicationError(`No upload handler configured for: ${apiName}`);
            }

            // Prepare context for Multer
            req.uploadDetails = { uploadType: handler.uploadType };

            await new Promise((resolve, reject) => {
                const uploadFn = multerInstance.single(handler.fieldName);

                uploadFn(req, res, (err) => {
                    if (err) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            reject(new ApplicationError(`File too large. Limit is ${(handler.maxFileSize / 1024 / 1024).toFixed(2)}MB`));
                        } else {
                            reject(new ApplicationError("File upload failed", err));
                        }
                    } else {
                        resolve();
                    }
                });
            });

            if (!req.file) {
                throw new ApplicationError("No file provided in request.");
            }

            // 2. Move file from Temp to Final Destination
            const result = await NE_UploadHelper.finalizeUpload(req.file, handler, req.body);

            // 3. Attach result to request for the Controller
            req.body.criteria = req.body.criteria || {};
            req.body.criteria.uploadedFileDetails = result;

            next();

        } catch (err) {
            const appError = err instanceof ApplicationError ? err : new ApplicationError("Upload Middleware Error", err);
            res.status(400).json(appError.getErrorObject());
        }
    }

    static async finalizeUpload(file, handler, bodyContext) {
        const baseDir = NE_Environment.UPLOAD_DIRECTORY || path.join(NE_Environment.ROOT_DIRECTORY, 'uploads');

        let subFolder = handler.uploadType;
        if (handler.folderNameCreator && typeof handler.folderNameCreator === 'function') {
            subFolder = handler.folderNameCreator(bodyContext);
        }

        const finalDir = path.join(baseDir, subFolder);
        if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

        let finalName = `file-${Date.now()}${path.extname(file.originalname)}`;
        if (handler.fileNameCreator && typeof handler.fileNameCreator === 'function') {
            finalName = handler.fileNameCreator(file, bodyContext);
        }

        const finalPath = path.join(finalDir, finalName);

        fs.renameSync(file.path, finalPath);

        return {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            fullPath: finalPath,
            relativePath: path.relative(NE_Environment.ROOT_DIRECTORY, finalPath).replace(/\\/g, '/') // Ensure forward slashes
        };
    }

    static deleteFile(filePath) {
        try {
            
            const fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(NE_Environment.ROOT_DIRECTORY, filePath);

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                logMessage({ level: 'INFO', message: `Deleted file: ${fullPath}` });
                return true;
            }
            return false;
        } catch (err) {
            logMessage({ level: 'ERROR', message: `Failed to delete file: ${filePath}`, errorObject: err });
            return false;
        }
    }
}

module.exports = {
    UploadHelper: NE_UploadHelper
};