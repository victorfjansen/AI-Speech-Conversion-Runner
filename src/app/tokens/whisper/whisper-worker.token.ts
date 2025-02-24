import { InjectionToken } from "@angular/core";

export const WHISPER_WORKER_TOKEN = new InjectionToken("WHISPER_WORKER_TOKEN", {
    factory: () => {
        return new Worker(new URL('../../workers/whisper/whisper.worker', import.meta.url));
    }
})