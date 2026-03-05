import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createStory, getStory, updateStory, addStep, listStories, getStoryFolder } from '../models/story.js';
import { generateStoryStart, generateStoryNext, generateReplayNarration, generateImagePrompt } from '../services/textGenerator.js';
import { generateImage } from '../services/imageGenerator.js';
import { textToSpeech, speechToText, getSpeechToken } from '../services/speechService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Track background image generation status: key = "storyId/filename", value = 'pending' | 'done' | 'failed'
const imageStatus = new Map();

// POST /api/story/create — Create a story from manual text input with --- step dividers
router.post('/story/create', async (req, res) => {
  try {
    const { language, title, body, backgroundDescription } = req.body;
    if (!language || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields: language, title, body' });
    }

    // Split body on --- dividers into steps, trim and discard empty segments
    const stepTexts = body.split(/^---$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (stepTexts.length === 0) {
      return res.status(400).json({ error: 'No story content found' });
    }

    // Generate image prompts sequentially so each step has cumulative context
    const imagePrompts = [];
    for (const text of stepTexts) {
      const prompt = await generateImagePrompt({ text, language, backgroundDescription, priorImagePrompts: imagePrompts });
      imagePrompts.push(prompt);
    }

    // Create story record
    const story = await createStory({ title, language, genre: 'custom', theme: '', setting: '', characterName: '', backgroundDescription });
    const storyId = story.id;
    const storyFolder = await getStoryFolder(storyId);

    const steps = [];
    for (let i = 0; i < stepTexts.length; i++) {
      const stepNumber = i + 1;
      const imageFilename = `step-${stepNumber}.png`;
      const imageUrl = `/api/story/${storyId}/image/${imageFilename}`;

      await addStep(storyId, {
        text: stepTexts[i],
        imagePrompt: imagePrompts[i],
        imagePath: imageFilename,
        userGuidance: null,
      });

      // Fire off image generation in background
      const imageKey = `${storyId}/${imageFilename}`;
      imageStatus.set(imageKey, 'pending');
      generateImage({ prompt: imagePrompts[i], outputPath: path.join(storyFolder, imageFilename) })
        .then(() => imageStatus.set(imageKey, 'done'))
        .catch(err => {
          console.warn(`Background image generation failed for step ${stepNumber}:`, err.message);
          imageStatus.set(imageKey, 'failed');
        });

      steps.push({ stepNumber, text: stepTexts[i], imageUrl });
    }

    await updateStory(storyId, { conversationHistory: [] });

    res.json({ storyId, title, steps });
  } catch (err) {
    console.error('Story create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/story/new
router.post('/story/new', async (req, res) => {
  try {
    const { genre = 'fairytale', theme, setting = '', characterName = '', language, freeformPrompt, audience = 'children', storyLength = 'short', generateImage: shouldGenerateImage = true } = req.body;
    if (!language) {
      return res.status(400).json({ error: 'Missing required field: language' });
    }

    const { title, storyText, imagePrompt, conversationHistory } = await generateStoryStart({ genre, theme, setting, characterName, language, freeformPrompt, audience, storyLength });
    const story = await createStory({ title, language, genre, theme, setting, characterName });
    const storyId = story.id;
    const storyFolder = await getStoryFolder(storyId);

    const imageFilename = 'step-1.png';
    const imageUrl = shouldGenerateImage ? `/api/story/${storyId}/image/${imageFilename}` : null;

    await addStep(storyId, { text: storyText, imagePrompt, imagePath: shouldGenerateImage ? imageFilename : null, userGuidance: null });
    await updateStory(storyId, { conversationHistory });

    // Return text immediately — don't wait for image
    res.json({
      storyId,
      title,
      steps: [{ stepNumber: 1, text: storyText, imageUrl }]
    });

    // Fire off image generation in background
    if (shouldGenerateImage) {
      const imageKey = `${storyId}/${imageFilename}`;
      imageStatus.set(imageKey, 'pending');
      generateImage({ prompt: imagePrompt, outputPath: path.join(storyFolder, imageFilename) })
        .then(() => imageStatus.set(imageKey, 'done'))
        .catch(err => {
          console.warn('Background image generation failed:', err.message);
          imageStatus.set(imageKey, 'failed');
        });
    }
  } catch (err) {
    const isContentFilter = err.code === 'content_filter' || (err.status === 400 && err.message?.includes('content'));
    if (isContentFilter) {
      return res.status(400).json({ error: 'content_filter' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/story/:id/next
router.post('/story/:id/next', async (req, res) => {
  try {
    const { id } = req.params;
    const { userGuidance, language, audience = 'children', storyLength = 'short', generateImage: shouldGenerateImage = true } = req.body;

    const story = await getStory(id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { storyText, imagePrompt, conversationHistory } = await generateStoryNext({
      conversationHistory: story.conversationHistory,
      userGuidance,
      language,
      audience,
      storyLength
    });

    const stepNumber = story.steps.length + 1;
    const imageFilename = `step-${stepNumber}.png`;
    const storyFolder = await getStoryFolder(id);
    const stepImageUrl = shouldGenerateImage ? `/api/story/${id}/image/${imageFilename}` : null;

    await addStep(id, { text: storyText, imagePrompt, imagePath: shouldGenerateImage ? imageFilename : null, userGuidance });
    await updateStory(id, { conversationHistory });

    // Return text immediately — don't wait for image
    res.json({
      step: { stepNumber, text: storyText, imageUrl: stepImageUrl }
    });

    // Fire off image generation in background
    if (shouldGenerateImage) {
      const imgKey = `${id}/${imageFilename}`;
      imageStatus.set(imgKey, 'pending');
      generateImage({ prompt: imagePrompt, outputPath: path.join(storyFolder, imageFilename) })
        .then(() => imageStatus.set(imgKey, 'done'))
        .catch(err => {
          console.warn('Background image generation failed:', err.message);
          imageStatus.set(imgKey, 'failed');
        });
    }
  } catch (err) {
    const isContentFilter = err.code === 'content_filter' || (err.status === 400 && err.message?.includes('content'));
    if (isContentFilter) {
      return res.status(400).json({ error: 'content_filter' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/story/:id
router.get('/story/:id', async (req, res) => {
  try {
    const story = await getStory(req.params.id);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const storyWithUrls = {
      ...story,
      steps: story.steps.map((step, i) => ({
        ...step,
        imageUrl: `/api/story/${req.params.id}/image/${step.imagePath}`
      }))
    };

    res.json(storyWithUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stories
router.get('/stories', async (_req, res) => {
  try {
    const stories = await listStories();
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/story/:id/image/:filename
router.get('/story/:id/image/:filename', async (req, res) => {
  try {
    const storyFolder = await getStoryFolder(req.params.id);
    const filePath = path.join(storyFolder, req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/story/:id/image-status/:filename — Check background image generation status
router.get('/story/:id/image-status/:filename', (req, res) => {
  const key = `${req.params.id}/${req.params.filename}`;
  const status = imageStatus.get(key) || 'unknown';
  res.json({ status });
});

// POST /api/replay-narration — Generate smooth replay narration merging user guidance with story text
router.post('/replay-narration', async (req, res) => {
  try {
    const { storyText, userGuidance, language } = req.body;
    if (!storyText || !userGuidance) {
      return res.status(400).json({ error: 'Missing required fields: storyText, userGuidance' });
    }
    const narration = await generateReplayNarration({ storyText, userGuidance, language: language || 'en' });
    res.json({ narration });
  } catch (err) {
    console.error('Replay narration error:', err);
    res.json({ narration: storyText }); // fallback to original text
  }
});

// POST /api/replay-narration/batch — Pre-merge all steps that have userGuidance
router.post('/replay-narration/batch', async (req, res) => {
  try {
    const { steps, language } = req.body;
    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Missing required field: steps (array)' });
    }

    // Process all steps with userGuidance in parallel
    const results = await Promise.all(
      steps.map(async (step, i) => {
        if (step.userGuidance && i > 0) {
          try {
            const narration = await generateReplayNarration({
              storyText: step.text,
              userGuidance: step.userGuidance,
              language: language || 'en',
            });
            return narration;
          } catch (err) {
            console.error(`Replay narration error for step ${i + 1}:`, err);
            return step.text; // fallback
          }
        }
        return step.text; // no guidance, use original
      })
    );

    res.json({ narrations: results });
  } catch (err) {
    console.error('Batch replay narration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tts — Text to Speech
router.post('/tts', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }
    const audioBuffer = await textToSpeech(text, language);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/story/:id/tts/:stepNumber — Cached Text to Speech per story step
router.post('/story/:id/tts/:stepNumber', async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const step = parseInt(stepNumber, 10);
    if (isNaN(step) || step < 1) {
      return res.status(400).json({ error: 'Invalid step number' });
    }

    const storyFolder = await getStoryFolder(id);
    if (!storyFolder) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const audioFile = path.join(storyFolder, `step-${step}.mp3`);

    // Return cached audio if it exists
    if (fs.existsSync(audioFile)) {
      res.set('Content-Type', 'audio/mpeg');
      return res.sendFile(path.resolve(audioFile));
    }

    // Generate TTS from request body text (or fall back to story step text)
    let text = req.body?.text;
    if (!text) {
      const story = await getStory(id);
      const stepData = story?.steps?.find(s => s.stepNumber === step);
      if (!stepData) {
        return res.status(404).json({ error: 'Step not found' });
      }
      text = stepData.text;
    }

    const language = req.body?.language || 'en';
    const audioBuffer = await textToSpeech(text, language);

    // Cache the audio to disk
    fs.writeFileSync(audioFile, audioBuffer);

    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    console.error('Cached TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stt — Speech to Text
router.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing audio file' });
    }
    console.log(`STT request: file=${req.file.originalname} size=${req.file.size} mime=${req.file.mimetype} lang=${req.body.language}`);
    const language = req.body.language || 'en';
    const transcript = await speechToText(req.file.buffer, req.file.originalname, language);
    console.log(`STT result: "${transcript}"`);
    res.json({ text: transcript });
  } catch (err) {
    console.error('STT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/speech-token — Get auth token for browser Speech SDK
router.get('/speech-token', async (req, res) => {
  try {
    const { token, region, endpoint } = await getSpeechToken();
    res.json({ token, region, endpoint });
  } catch (err) {
    console.error('Speech token error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
