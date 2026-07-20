export interface MusicInfo {
  time: string;
  name: string;
  author: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
