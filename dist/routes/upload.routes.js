"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_middleware_1 = require("../middlewares/multer.middleware");
const cloudinary_1 = require("../utils/cloudinary");
const router = express_1.default.Router();
// Upload Image Endpoint
router.post('/upload-image', multer_middleware_1.upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded or invalid file type.' });
        }
        const { path, filename } = req.file;
        // You can handle the file further here (e.g., move it to permanent storage, process it, etc.)
        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully.',
            data: {
                filename,
                path,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred during image upload.',
        });
    }
});
router.post('/upload-to-cloudinary', multer_middleware_1.upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded or invalid file type.' });
        }
        const localFilePath = req.file.path;
        // Upload the file to Cloudinary
        const uploadResponse = yield (0, cloudinary_1.uploadOnCloudinary)(localFilePath);
        if (!uploadResponse) {
            return res.status(500).json({ success: false, message: 'Failed to upload image to Cloudinary.' });
        }
        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully.',
            data: {
                url: uploadResponse.secure_url,
                public_id: uploadResponse.public_id,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'An error occurred during the upload.',
            error: error.message,
        });
    }
}));
exports.default = router;
