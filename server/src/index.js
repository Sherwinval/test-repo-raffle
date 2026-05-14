import dotenv from 'dotenv';
import app from './app.js';
import { startMailWorker } from './services/mail.service.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  try {
    startMailWorker();
    console.log('Mail worker started.');
  } catch (e) {
    console.warn('Mail worker failed to start:', e.message);
  }
});
