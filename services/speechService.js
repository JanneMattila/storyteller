/**
 * Azure Cognitive Services Speech — TTS & STT via REST API.
 *
 * TTS: POST {cogEndpoint}/tts/cognitiveservices/v1  (SSML body)
 * STT: POST {region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1
 */

const SPEECH_KEY = process.env.FOUNDRY_API_KEY;
const COG_ENDPOINT = (process.env.AZURE_SPEECH_ENDPOINT || process.env.FOUNDRY_ENDPOINT)
  ?.replace('services.ai.azure.com', 'cognitiveservices.azure.com')
  ?.replace(/\/+$/, '');
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'swedencentral';

// Best available voices
const VOICES = {
  en: 'en-US-Ava:DragonHDLatestNeural',   // latest HD, warm & expressive
  fi: 'fi-FI-SelmaNeural',                 // best Finnish female voice
};

/**
 * Convert text to speech. Returns a Buffer of MP3 audio.
 */
export async function textToSpeech(text, language) {
  const voice = VOICES[language] || VOICES.en;
  const lang = language === 'fi' ? 'fi-FI' : 'en-US';

  const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
  <voice name="${voice}">${escapeXml(text)}</voice>
</speak>`;

  const response = await fetch(`${COG_ENDPOINT}/tts/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`TTS failed (${response.status}): ${errText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Convert speech audio buffer to text via Azure STT REST API.
 */
export async function speechToText(audioBuffer, originalName, language) {
  const lang = language === 'fi' ? 'fi-FI' : 'en-US';
  const sttUrl = `https://${SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${lang}&format=detailed`;

  // Detect content type from filename
  const ext = (originalName || '').split('.').pop().toLowerCase();
  const contentTypeMap = {
    wav: 'audio/wav',
    ogg: 'audio/ogg;codecs=opus',
    webm: 'audio/webm;codecs=opus',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
  };
  const contentType = contentTypeMap[ext] || 'audio/webm;codecs=opus';

  const response = await fetch(sttUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SPEECH_KEY,
      'Content-Type': contentType,
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`STT failed (${response.status}): ${errText}`);
  }

  const result = await response.json();
  if (result.RecognitionStatus === 'NoMatch' || result.RecognitionStatus === 'InitialSilenceTimeout') {
    return '';
  }
  if (result.RecognitionStatus !== 'Success') {
    throw new Error(`STT recognition failed: ${result.RecognitionStatus}`);
  }
  return result.DisplayText || result.NBest?.[0]?.Display || '';
}

/**
 * Get an authorization token for the browser Speech SDK.
 * Token is valid for 10 minutes.
 */
export async function getSpeechToken() {
  const tokenUrl = `${COG_ENDPOINT}/sts/v1.0/issueToken`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': SPEECH_KEY,
      'Content-Length': '0',
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token fetch failed (${response.status}): ${errText}`);
  }
  const token = await response.text();
  return { token, region: SPEECH_REGION, endpoint: COG_ENDPOINT };
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
