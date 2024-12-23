"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.deleteUploadedFiles = void 0;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|jpeg|jpg|png/;
    const isValidFileType = allowedTypes.test(file.mimetype);
    if (isValidFileType) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
/**
 * Deletes an array of files from the file system.
 * @param filesMap - An object where keys are file fields and values are arrays of file paths.
 */
const deleteUploadedFiles = (filesMap) => {
    Object.values(filesMap).forEach((fileArray) => {
        fileArray === null || fileArray === void 0 ? void 0 : fileArray.forEach((file) => {
            if (file === null || file === void 0 ? void 0 : file.path) {
                fs_1.default.unlink(file.path, (err) => {
                    if (err) {
                        console.error(`Error deleting file: ${file.path}`, err);
                    }
                    else {
                        console.log(`Successfully deleted file: ${file.path}`);
                    }
                });
            }
        });
    });
};
exports.deleteUploadedFiles = deleteUploadedFiles;
exports.upload = (0, multer_1.default)({ storage: storage, fileFilter: fileFilter });
