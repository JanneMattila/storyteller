import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, '') + '/openai/v1/',
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_API_KEY,
  },
});

const MODEL = process.env.AZURE_OPENAI_DEPLOYMENT;

function getLanguageInstruction(language) {
  return language === 'fi' ? 'Finnish' : 'English';
}

function getAudienceInstruction(audience) {
  if (audience === 'children') {
    return 'This story is for SMALL CHILDREN (ages 3-7). Use only simple, short words a toddler can understand. The story MUST be gentle, safe, and positive — absolutely NO violence, scary moments, danger, death, or anything frightening. Keep it warm, playful, and reassuring.';
  }
  return 'This story is for a general audience. Use rich, expressive vocabulary. All themes and narrative tension are welcome — adventure, mystery, mild peril, humor, drama.';
}

function getLengthInstruction(storyLength) {
  if (storyLength === 'long') {
    return 'LENGTH: Write a full scene of 150-250 words with vivid description, dialogue, and atmosphere. End with a question offering 3 choices for what happens next. This will be read aloud.';
  }
  if (storyLength === 'medium') {
    return 'LENGTH: Write a paragraph of 80-120 words with descriptive detail. Then ask the listener what should happen next, offering exactly 3 choices. This will be read aloud.';
  }
  return 'STRICT LIMIT: Write exactly 2-3 short sentences describing one scene (MAX 40 words for the scene). Then ask the listener what should happen next, offering exactly 3 choices in one sentence. Total output must be under 80 words. This will be read aloud — brevity is essential.';
}

export async function generateStoryStart({ genre, theme, setting, characterName, language, freeformPrompt, audience = 'children', storyLength = 'short' }) {
  const lang = getLanguageInstruction(language);
  const audienceGuide = getAudienceInstruction(audience);
  const lengthGuide = getLengthInstruction(storyLength);

  const systemPrompt = [
    `You are a warm storyteller. Write in ${lang}.`,
    audienceGuide,
    freeformPrompt
      ? 'The listener described their own story idea — use it creatively.'
      : `Genre/style: ${genre}.`,
    lengthGuide,
    'Image prompt: 1 sentence, English only, describing the scene visually.',
    'JSON: { "title": "Story Title", "storyText": "...", "imagePrompt": "..." }',
  ].join(' ');

  const userMessage = freeformPrompt
    ? `The listener says: "${freeformPrompt}". Create a story based on this idea.`
    : `Create a ${genre} story with the theme "${theme}", set in ${setting}. The main character is ${characterName}.`;

  const messages = [
    { role: 'developer', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await client.chat.completions.create({
      messages,
      model: MODEL,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    const conversationHistory = [
      ...messages,
      { role: 'assistant', content: response.choices[0].message.content },
    ];

    return {
      title: result.title,
      storyText: result.storyText,
      imagePrompt: result.imagePrompt,
      conversationHistory,
    };
  } catch (error) {
    console.error('Error generating story start:', error);
    throw new Error(`Failed to generate story start: ${error.message}`);
  }
}

export async function generateStoryNext({ conversationHistory, userGuidance, language, audience = 'children', storyLength = 'short' }) {
  const lang = getLanguageInstruction(language);
  const audienceGuide = getAudienceInstruction(audience);
  const lengthGuide = getLengthInstruction(storyLength);

  const messages = [
    ...conversationHistory,
    { role: 'user', content: userGuidance },
    {
      role: 'developer',
      content: `Continue the story in ${lang} based on the listener's choice. ${audienceGuide} ${lengthGuide} Image prompt: 1 sentence, English only. JSON: { "storyText": "...", "imagePrompt": "..." }`,
    },
  ];

  try {
    const response = await client.chat.completions.create({
      messages,
      model: MODEL,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userGuidance },
      { role: 'assistant', content: response.choices[0].message.content },
    ];

    return {
      storyText: result.storyText,
      imagePrompt: result.imagePrompt,
      conversationHistory: updatedHistory,
    };
  } catch (error) {
    console.error('Error generating story continuation:', error);
    throw new Error(`Failed to generate story continuation: ${error.message}`);
  }
}

/**
 * Create a smooth replay narration that weaves the user's guidance into the story text.
 * Instead of asking choices, it narrates what the listener chose and flows into the next part.
 */
export async function generateReplayNarration({ storyText, userGuidance, language }) {
  const lang = getLanguageInstruction(language);

  const response = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a storyteller narrator replaying a story. The story had an interactive moment where the listener gave direction, and then the story continued. Your job is to rewrite the story continuation so it naturally incorporates the chosen direction.

IMPORTANT RULES:
- Do NOT say "you chose", "you selected", "you decided", or address the listener directly about their choice
- Instead, narrate the chosen direction as a natural part of the story, as if it was always meant to happen
- The guidance should flow seamlessly into the continuation — it should read as one continuous story passage
- Remove any choice lists or questions from the end of the text
- Write in ${lang}
- Keep it natural as if reading from a storybook
- Return ONLY the merged narration text, nothing else. Do not wrap in quotes.`
      },
      {
        role: 'user',
        content: `The listener's chosen direction was: "${userGuidance}"

The story continuation that followed: "${storyText}"

Rewrite this as a single smooth story passage where the chosen direction naturally leads into the continuation.`
      }
    ],
    model: MODEL,
  });

  return response.choices[0].message.content.trim();
}
