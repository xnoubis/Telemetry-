export type AvatarStateEnum = 'spiral' | 'mouth' | 'line';
export type TriggerEnum = 'fastapi_retrieval' | 'web_tts' | 'mutation_observer' | 'pointer_event';

export interface AvatarState {
  state: AvatarStateEnum;
  trigger: TriggerEnum;
  timestamp: string;
}

export interface AnchorSnapshot {
  text_selection: string | null;
  css_path: string | null;
  offsets: [number, number] | null;
  page_url: string | null;
  visual_focus_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  error?: string;
}

export type GestureEnum = 'tap' | 'double_tap' | 'triple_tap' | 'hold' | 'hold_drag' | 'wheel_scroll';

export interface GestureEvent {
  gesture: GestureEnum;
  timestamp: string;
  target?: string;
  metadata?: any;
}

export type ServerPhaseEnum = 'warm_in' | 'dive' | 'reflect' | 'failover';
export type ServerStatusEnum = 'success' | 'failover' | 'error';

export interface ServerPhaseEvent {
  phase: ServerPhaseEnum;
  start_time: string;
  duration_seconds?: number;
  status: ServerStatusEnum;
  error_message?: string;
}

export interface SigilSynthesis {
  gesture_history: GestureEvent[];
  semantic_seed: string;
  difficulty_level: 0 | 1 | 2;
  canvas_signature?: string;
}
