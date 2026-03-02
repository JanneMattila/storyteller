import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import storyRoutes from './routes/storyRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', storyRoutes);

// Serve /create page
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

// SPA fallback — serve index.html for non-API routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Storyteller server running at http://localhost:${PORT}`);
});
