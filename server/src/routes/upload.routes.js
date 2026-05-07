import { Router } from 'express';
import { upload } from '../config/multer.js';
import {
  uploadParticipants,
  validateUpload,
  getUploadProgress
} from '../controllers/upload.controller.js';

const router = Router();

router.post('/', upload.single('file'), uploadParticipants);
router.post('/validate', upload.single('file'), validateUpload);
router.get('/progress/:uploadId', getUploadProgress);

export default router;
