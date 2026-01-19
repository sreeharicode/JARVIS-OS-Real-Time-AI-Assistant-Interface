
export interface Message {
  id: string;
  role: 'user' | 'jarvis';
  content: string;
  timestamp: number;
}

export interface SystemStatus {
  cpu: number;
  memory: number;
  connection: 'online' | 'offline' | 'connecting';
  power: number;
}

export enum InteractionMode {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  VISION = 'VISION'
}
