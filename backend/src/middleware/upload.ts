import fs from 'fs';
import multer from 'multer';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/octet-stream') {
      return cb(new BadRequestError('Unsupported file type'));
    }
    cb(null, true);
  },
});
