import { Router } from 'express';
import { put, del, get } from '@vercel/blob';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
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

    const folder = req.body.folder || 'misc';
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const entityType = req.body.entityType?.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const entityId = req.body.entityId?.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');

    const entityPath = entityType && entityId ? `${entityType}/${entityId}` : entityType || '_';
    const uniqueFilename = `rentcar/${safeFolder}/${entityPath}/${Date.now()}-${safeName}`;
    
    const blob = await put(uniqueFilename, req.file.buffer, {
      access: 'private',
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

// GET /api/uploads/proxy — serve image through backend (hides raw blob URL)
router.get('/proxy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.query.url as string | undefined;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Security: only allow proxying Vercel Blob URLs
    if (!url.includes('.public.blob.vercel-storage.com') && !url.includes('.private.blob.vercel-storage.com')) {
      return res.status(403).json({ success: false, error: 'Invalid blob URL' });
    }

    const result = await get(url, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!result || result.statusCode !== 200) {
      return res.status(502).json({ success: false, error: 'Failed to fetch image' });
    }

    const reader = result.stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', result.blob.contentType || 'image/jpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
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
