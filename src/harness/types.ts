export type LockActor = 'manual' | 'script' | 'agent';

export type LockState = 'idle' | 'script_running' | 'agent_active' | 'manual_override';

export interface DeviceLockInfo {
  serial: string;
  state: LockState;
  owner: string;
  reason: string;
  acquiredAt: number;
  expiresAt: number;
}

export interface UiNode {
  index?: number;
  text?: string;
  resourceId?: string;
  className?: string;
  packageName?: string;
  contentDesc?: string;
  checkable?: boolean;
  checked?: boolean;
  clickable?: boolean;
  enabled?: boolean;
  focusable?: boolean;
  focused?: boolean;
  scrollable?: boolean;
  longClickable?: boolean;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  };
  children?: UiNode[];
}

export interface CompactUiElement {
  id?: string;
  text?: string;
  desc?: string;
  type: string;
  bounds: [number, number, number, number]; // [left, top, right, bottom]
  center: [number, number]; // [x, y]
  clickable: boolean;
}
