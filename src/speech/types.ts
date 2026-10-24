export type RecognitionErrorCode =
  | 'unsupported'
  | 'not-allowed'
  | 'audio-capture'
  | 'network'
  | 'language-not-supported'
  | 'failed';

export interface RecognitionHandlers {
  onInterim(text: string): void;
  onFinal(text: string): void;
  onError(code: RecognitionErrorCode): void;
  onEnd(): void;
}

// Both the Web Speech API and the scripted sample recitation feed the engine through this interface.
export interface RecognitionSource {
  start(handlers: RecognitionHandlers): void;
  stop(): void;
}
