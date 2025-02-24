import {
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { Subject } from 'rxjs';
import { WHISPER_WORKER_TOKEN } from '../../tokens/whisper/whisper-worker.token';
import { eAvailableModels } from '../../enums/available-models.enum';

@Injectable({ providedIn: 'root' })
export class TransformersService {
  private _transcriptionSubject$ = new Subject<string>();
  transcriptionSubject$ = this._transcriptionSubject$.asObservable();

  private audioContext?: AudioContext;

  private worker = inject(WHISPER_WORKER_TOKEN);
  private currentModel: eAvailableModels = eAvailableModels.WHISPER_BASE;

  constructor() {
    this.setWorkerListener()
  }

  async processAudioStream(
    audioChunks: AsyncIterable<Float32Array>
  ): Promise<void> {
    await this.audioContext?.close();
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    for await (const chunk of audioChunks) {
      this.worker.postMessage({
        type: 'CHUNK',
        audio: chunk,
        model: this.currentModel
      });
    }
  }

  async *createAudioChunks(
    file: File,
    chunkSizeSeconds = 30
  ): AsyncIterable<Float32Array> {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await file.arrayBuffer();

    const audioBuffer = await audioContext.decodeAudioData(
      arrayBuffer.slice(0) // Create copy for transfer
    );

    const monoData = this.convertToMono(audioBuffer);
    let offset = 0;
    const samplesPerChunk = 16000 * chunkSizeSeconds;

    while (offset < monoData.length) {
      const chunk = monoData.slice(offset, offset + samplesPerChunk);
      offset += samplesPerChunk;
      yield new Float32Array(chunk.buffer); // Create new buffer reference
    }

    audioContext.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  private convertToMono(buffer: AudioBuffer): Float32Array {
    const monoData = new Float32Array(buffer.length);
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < buffer.length; i++) {
      monoData[i] = (left[i] + right[i]) / 2;
    }
    return monoData;
  }

  resetAll(): void {
    this.audioContext?.close();
    this.audioContext = new AudioContext({ sampleRate: 16000 });

    this.worker.terminate();
    this.worker.onmessage = null;
    this.worker = undefined as any;

    this.worker = new Worker(new URL('../../workers/whisper/whisper.worker', import.meta.url));
    this.setWorkerListener();
  }

  setWorkerListener(): void {
    this.worker.onmessage = ({ data }) => {
      if (data.type === 'TRANSCRIPTION') {
        this._transcriptionSubject$.next(data.text);
      }
    };
  }

  setModel(model: eAvailableModels): void {
    this.currentModel = model;
  }
}
