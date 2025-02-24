import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { TransformersService } from './services/transformers/transformers.service';
import { Subscription, tap } from 'rxjs';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { eAvailableModels } from './enums/available-models.enum';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [
    NzFlexModule,
    NzUploadModule,
    NzIconModule,
    NzButtonModule,
    NzRadioModule,
    FormsModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  transcription = '';
  isProcessing = false;

  fileList: NzUploadFile[] = [];
  protected file?: File;

  protected currentModel = eAvailableModels.WHISPER_BASE;
  protected readonly availableModels: typeof eAvailableModels =
    eAvailableModels;

  private readonly transformers = inject(TransformersService);
  private readonly destroyRef = inject(DestroyRef);

  private _subscription: Subscription | null = null;

  onFileSelected(event: any) {
    this.file = event.target.files[0];
  }

  async startTranscription() {
    if (!this.file) return;

    this.transformers.setModel(this.currentModel);

    this.isProcessing = true;
    this.transcription = '';

    const audioChunks = this.transformers.createAudioChunks(this.file);

    this._subscription = this.transformers.transcriptionSubject$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (text) => {
          this.transcription += text + ' ';
        },
        complete: () => {
          this.isProcessing = false;
          this.transformers.resetAll();
        },
        error: () => {
          this.isProcessing = false;
          this.transformers.resetAll();
        },
      });

    this.transformers.processAudioStream(audioChunks);

    this.file = undefined;
    this.fileList = [];
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = this.fileList.concat(file);
    this.file = file as unknown as File;
    return false;
  };

  resetAll(): void {
    this.transformers.resetAll();
    this._subscription?.unsubscribe();

    this.isProcessing = false;
    this.transcription = '';

    this.file = undefined;
    this.fileList = [];
  }
}
