/// <reference lib="webworker" />

import { pipeline, env, TextStreamer } from '@huggingface/transformers';

env.allowLocalModels = true;
env.localModelPath = 'models/';
env.allowRemoteModels = false;

let whisperPipeline: any;
let processingQueue: Promise<void> = Promise.resolve();
let isProcessing = false;

async function buildPipeline(data: any): Promise<void> {
  return await pipeline('automatic-speech-recognition', data?.model || 'whisper-tiny/', {
    local_files_only: true,
    device: 'wasm'
  }).then((pipeline) => {
    whisperPipeline = pipeline;
  });
}

addEventListener('message', async ({ data }) => {
  processingQueue = processingQueue.then(async () => {
    if(!whisperPipeline) {
      await buildPipeline(data);
    }

    if (isProcessing) {
      postMessage({ type: 'BUSY', message: 'Session busy' });
      return;
    }

    isProcessing = true;
    try {
      const textStreamer = new TextStreamer(whisperPipeline.tokenizer, {
        skip_prompt: true,
        callback_function: (result) => {
          postMessage({
            type: 'TRANSCRIPTION',
            text: result,
            isFinal: data.isFinal,
          });
        },
      });

      await whisperPipeline(data.audio, {
        return_timestamps: false,
        language: 'en', // Explicitly set language
        forced_decoder_ids: [[1, 50259]], // Disable multilingual mode
        streamer: textStreamer,
      });
      
    } catch (error) {
	console.log(error, "ERROR! [jansen]");
      postMessage({ type: 'ERROR', message: (error as any).message });

      if ((error as any).message.includes('Session mismatch')) {
	console.log("session mismatch!");
        whisperPipeline = null;
      }
    } finally {
      isProcessing = false;
    }
  });
});
