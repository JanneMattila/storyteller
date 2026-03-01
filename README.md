# Storyteller 📖

Interactive voice-driven storytelling web app. Users speak to guide a story and AI generates narrative text with accompanying illustrations.

## Features

- Voice-first interaction using Web Speech API
- Bilingual support: English 🇬🇧 and Finnish 🇫🇮
- AI-generated story text via Azure OpenAI
- AI-generated illustrations via Microsoft Foundry (Stable-Image-Ultra)
- Auto-narration with text-to-speech
- Story persistence with local folder storage
- Each story saved with a README.md for offline viewing

## Prerequisites

- Node.js 18+
- Azure OpenAI deployment (GPT-4o or similar)
- Microsoft Foundry deployment (Stable-Image-Ultra)

## Quick Start

1. Clone and install: `npm install`
2. Copy `.env.example` to `.env` and fill in your API credentials
3. Start: `npm start`
4. Open http://localhost:3000

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint (e.g. `https://<resource>.openai.azure.com`) |
| `AZURE_OPENAI_API_KEY` | API key for Azure OpenAI |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name for the chat model (e.g. `gpt-4o`) |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI API version (default: `2024-10-21`) |
| `FOUNDRY_ENDPOINT` | Microsoft Foundry models endpoint (e.g. `https://<resource>.services.ai.azure.com/models`) |
| `FOUNDRY_API_KEY` | API key for Microsoft Foundry |
| `FOUNDRY_IMAGE_MODEL` | Image generation model name (default: `Stable-Image-Ultra`) |
| `PORT` | Server port (default: `3000`) |

## How It Works

1. Choose language (English or Finnish)
2. Tap the microphone and describe the story you want
3. AI generates the first story segment with an illustration
4. The story is read aloud automatically
5. When narration ends, the microphone activates again
6. Guide the story with your voice — repeat!

## Project Structure

```
storyteller/
├── server.js              # Express server entry point
├── package.json
├── .env.example           # Environment variable template
├── models/
│   └── story.js           # Story data model and persistence
├── routes/
│   └── storyRoutes.js     # API route handlers
├── services/
│   ├── textGenerator.js   # Azure OpenAI text generation
│   └── imageGenerator.js  # Microsoft Foundry image generation
├── public/
│   ├── index.html         # Main UI
│   ├── css/               # Stylesheets
│   └── js/
│       └── app.js         # Frontend logic (speech, UI, API calls)
└── stories/               # Generated story storage
```

## API Endpoints

- **POST** `/api/story/new` — Create a new story (body: `genre`, `theme`, `setting`, `characterName`, `language`)
- **POST** `/api/story/:id/next` — Continue a story with user guidance (body: `userGuidance`, `language`)
- **GET** `/api/story/:id` — Retrieve a story by ID
- **GET** `/api/stories` — List all saved stories
- **GET** `/api/story/:id/image/:filename` — Serve a story illustration

## Story Storage

Stories are saved in timestamped folders under `stories/` with `story.json`, images, and a human-readable `README.md`.

## Tech Stack

- **Frontend:** HTML / CSS / JavaScript, Web Speech API
- **Backend:** Node.js, Express
- **AI:** Azure OpenAI, Microsoft Foundry
