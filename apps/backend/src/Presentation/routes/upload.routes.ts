import { Router } from 'express';
import { put, del } from '@vercel/blob';
import multer from 'multer';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// POST /api/uploads
router.post('/', authMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const uniqueFilename = `rentcar/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    const blob = await put(uniqueFilename, req.file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    res.status(200).json({
      success: true,
      data: {
        url: blob.url,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/uploads
router.delete('/', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required to delete a file' });
    }

    await del(url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'File deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
