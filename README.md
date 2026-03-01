# Storyteller 📖

Interactive voice-driven storytelling web app. Users speak to guide a story and AI generates narrative text with accompanying illustrations.

## Features

- Voice-first interaction with server-side speech-to-text (Azure Cognitive Services)
- Bilingual support: English 🇬🇧 and Finnish 🇫🇮
- AI-generated story text via Azure OpenAI
- AI-generated illustrations via Azure AI Foundry (FLUX.1-Kontext-pro)
- Auto-narration with server-side text-to-speech (Azure Cognitive Services)
- Audience modes: children (ages 3-7) and general
- Configurable story length: short, medium, long
- Freeform prompt support — describe any story idea
- Background image generation with status polling
- Story replay with merged narration
- Story persistence with local folder storage
- Each story saved with a README.md for offline viewing

## Prerequisites

- Node.js 18+
- Azure OpenAI deployment (GPT-4o or similar)
- Azure AI Foundry deployment (FLUX.1-Kontext-pro or other image model)
- Azure Cognitive Services (Speech) for TTS and STT

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
| `FOUNDRY_ENDPOINT` | Azure AI Foundry endpoint (e.g. `https://<resource>.services.ai.azure.com/`) |
| `FOUNDRY_API_KEY` | API key for Azure AI Foundry |
| `FOUNDRY_IMAGE_MODEL` | Image generation model name (default: `FLUX.1-Kontext-pro`) |
| `FOUNDRY_TTS_MODEL` | Text-to-speech model name (default: `tts`) |
| `FOUNDRY_TTS_VOICE` | TTS voice name (default: `nova`) |
| `FOUNDRY_STT_MODEL` | Speech-to-text model name (default: `whisper`) |
| `STORIES_PATH` | Path for story storage (default: `./stories`) |
| `PORT` | Server port (default: `3000`) |

## How It Works

1. Choose language (English or Finnish), audience, and story length
2. Tap the microphone and describe the story you want (or type a freeform prompt)
3. AI generates the first story segment with an illustration
4. The story is read aloud automatically via server-side TTS
5. When narration ends, the microphone activates again
6. Guide the story with your voice — repeat!
7. Replay any saved story with merged narration

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
│   ├── imageGenerator.js  # Azure AI Foundry image generation
│   └── speechService.js   # Azure Cognitive Services TTS & STT
├── public/
│   ├── index.html         # Main UI
│   ├── css/               # Stylesheets
│   └── js/
│       └── app.js         # Frontend logic (speech, UI, API calls)
└── stories/               # Generated story storage
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| **POST** | `/api/story/new` | Create a new story (body: `genre`, `theme`, `setting`, `characterName`, `language`, `freeformPrompt`, `audience`, `storyLength`, `generateImage`) |
| **POST** | `/api/story/:id/next` | Continue a story (body: `userGuidance`, `language`, `audience`, `storyLength`, `generateImage`) |
| **GET** | `/api/story/:id` | Retrieve a story by ID |
| **GET** | `/api/stories` | List all saved stories |
| **GET** | `/api/story/:id/image/:filename` | Serve a story illustration |
| **GET** | `/api/story/:id/image-status/:filename` | Check background image generation status |
| **POST** | `/api/tts` | Text-to-speech (body: `text`, `language`) — returns MP3 audio |
| **POST** | `/api/stt` | Speech-to-text (multipart: `audio` file, `language`) |
| **GET** | `/api/speech-token` | Get browser Speech SDK auth token |
| **POST** | `/api/replay-narration` | Merge user guidance with story text for replay (body: `storyText`, `userGuidance`, `language`) |
| **POST** | `/api/replay-narration/batch` | Batch merge all steps for replay (body: `steps[]`, `language`) |

## Story Storage

Stories are saved in timestamped folders under `stories/` with `story.json`, images, and a human-readable `README.md`.

## Tech Stack

- **Frontend:** HTML / CSS / JavaScript, Microsoft Cognitive Services Speech SDK
- **Backend:** Node.js, Express, Multer
- **AI:** Azure OpenAI (text generation), Azure AI Foundry (image generation)
- **Speech:** Azure Cognitive Services (TTS & STT)
