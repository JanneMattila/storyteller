import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = process.env.STORIES_PATH || path.join(__dirname, '..', 'stories');

async function ensureStoriesDir() {
  await fs.mkdir(STORIES_DIR, { recursive: true });
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createStory({ title, language, genre, theme, setting, characterName }) {
  await ensureStoriesDir();

  const id = crypto.randomUUID();
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '');
  const folderName = `${timestamp}_${slugify(title)}`;
  const folderPath = path.join(STORIES_DIR, folderName);

  await fs.mkdir(folderPath, { recursive: true });

  const story = {
    id,
    title,
    language,
    genre,
    theme,
    setting,
    characterName,
    folderName,
    steps: [],
    conversationHistory: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await fs.writeFile(path.join(folderPath, 'story.json'), JSON.stringify(story, null, 2));
  await generateReadme(story);

  return story;
}

export async function getStory(storyId) {
  await ensureStoriesDir();

  const entries = await fs.readdir(STORIES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(STORIES_DIR, entry.name, 'story.json');
    try {
      const data = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
      if (data.id === storyId) return data;
    } catch {
      // skip folders without valid story.json
    }
  }
  return null;
}

export async function updateStory(storyId, updates) {
  await ensureStoriesDir();

  const story = await getStory(storyId);
  if (!story) return null;

  Object.assign(story, updates, { updatedAt: new Date().toISOString() });

  const folderPath = path.join(STORIES_DIR, story.folderName);
  await fs.writeFile(path.join(folderPath, 'story.json'), JSON.stringify(story, null, 2));
  await generateReadme(story);

  return story;
}

export async function addStep(storyId, { text, imagePrompt, imagePath, userGuidance }) {
  await ensureStoriesDir();

  const story = await getStory(storyId);
  if (!story) return null;

  const stepNumber = story.steps.length + 1;
  story.steps.push({
    stepNumber,
    text,
    imagePrompt,
    imagePath: imagePath || `step-${stepNumber}.png`,
    userGuidance: userGuidance || null,
  });
  story.updatedAt = new Date().toISOString();

  const folderPath = path.join(STORIES_DIR, story.folderName);
  await fs.writeFile(path.join(folderPath, 'story.json'), JSON.stringify(story, null, 2));
  await generateReadme(story);

  return story;
}

export async function listStories() {
  await ensureStoriesDir();

  const entries = await fs.readdir(STORIES_DIR, { withFileTypes: true });
  const stories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(STORIES_DIR, entry.name, 'story.json');
    try {
      const data = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
      stories.push({
        id: data.id,
        title: data.title,
        language: data.language,
        genre: data.genre,
        folderName: data.folderName,
        stepCount: data.steps.length,
        createdAt: data.createdAt,
      });
    } catch {
      // skip invalid entries
    }
  }

  return stories;
}

export async function getStoryFolder(storyId) {
  await ensureStoriesDir();

  const story = await getStory(storyId);
  if (!story) return null;

  return path.join(STORIES_DIR, story.folderName);
}

export async function generateReadme(story) {
  const lines = [
    `# ${story.title}`,
    '',
    `**Genre:** ${story.genre}`,
    `**Language:** ${story.language}`,
    `**Character:** ${story.characterName}`,
    `**Setting:** ${story.setting}`,
    '',
  ];

  for (const step of story.steps) {
    lines.push(`## Step ${step.stepNumber}`);
    lines.push('');
    lines.push(step.text);
    lines.push('');
    lines.push(`![Step ${step.stepNumber}](step-${step.stepNumber}.png)`);
    lines.push('');
  }

  const folderPath = path.join(STORIES_DIR, story.folderName);
  await fs.writeFile(path.join(folderPath, 'README.md'), lines.join('\n'));
}
