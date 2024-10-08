import multer from 'multer';
import { Request, Response } from 'express';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix)
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /pdf|jpeg|jpg|png/;

    const isValidFileType = allowedTypes.test(file.mimetype);
    if (isValidFileType) {
        cb(null, true);
    } else {      
        cb(null, false);
    }
};

export const upload = multer({ storage, fileFilter });