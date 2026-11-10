import { AdbBridge } from '../devices/adb.js';
import type { UiNode, CompactUiElement } from './types.js';

export class AndroidHarness {
  /**
   * Common app package aliases for easy natural language launching
   */
  static readonly APP_ALIASES: Record<string, string> = {
    whatsapp: 'com.whatsapp',
    'whatsapp-business': 'com.whatsapp.w4b',
    instagram: 'com.instagram.android',
    tiktok: 'com.zhiliaoapp.musically',
    youtube: 'com.google.android.youtube',
    chrome: 'com.android.chrome',
    settings: 'com.android.settings',
    camera: 'com.sec.android.app.camera',
  };

  /**
   * Resolve an app name or alias to its package name
   */
  static resolvePackage(name: string): string {
    const clean = name.trim().toLowerCase();
    return this.APP_ALIASES[clean] || name;
  }

  /**
   * Dumps and parses Android UI hierarchy XML into structured UiNodes.
   */
  static async getUiHierarchy(serial: string): Promise<UiNode[]> {
    const xml = await AdbBridge.dumpUiHierarchy(serial);
    return this.parseXmlNodes(xml);
  }

  /**
   * Returns a compact, token-optimized list of meaningful UI elements
   * (only elements with visible text, content description, or clickable interactive controls).
   */
  static async getCompactElements(serial: string): Promise<CompactUiElement[]> {
    const rawNodes = await this.getUiHierarchy(serial);
    const elements: CompactUiElement[] = [];

    const traverse = (nodes: UiNode[]) => {
      for (const n of nodes) {
        const hasText = !!(n.text && n.text.trim());
        const hasDesc = !!(n.contentDesc && n.contentDesc.trim());
        const isClickable = !!n.clickable;
        const isScrollable = !!n.scrollable;

        if (hasText || hasDesc || isClickable || isScrollable) {
          const type = (n.className || '').split('.').pop() || 'Element';
          elements.push({
            id: n.resourceId,
            text: n.text?.trim() || undefined,
            desc: n.contentDesc?.trim() || undefined,
            type,
            bounds: [n.bounds.left, n.bounds.top, n.bounds.right, n.bounds.bottom],
            center: [n.bounds.centerX, n.bounds.centerY],
            clickable: isClickable,
          });
        }

        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };

    traverse(rawNodes);
    return elements;
  }

  /**
   * Searches for an element matching text, resource-id, or content-desc.
   */
  static async findElement(
    serial: string,
    query: { text?: string; id?: string; desc?: string; partial?: boolean }
  ): Promise<CompactUiElement | null> {
    const elements = await this.getCompactElements(serial);
    const partial = query.partial !== false;

    for (const el of elements) {
      if (query.text) {
        const textTarget = query.text.toLowerCase();
        const elText = (el.text || '').toLowerCase();
        if (partial ? elText.includes(textTarget) : elText === textTarget) {
          return el;
        }
      }

      if (query.id) {
        const idTarget = query.id.toLowerCase();
        const elId = (el.id || '').toLowerCase();
        if (partial ? elId.includes(idTarget) : elId === idTarget) {
          return el;
        }
      }

      if (query.desc) {
        const descTarget = query.desc.toLowerCase();
        const elDesc = (el.desc || '').toLowerCase();
        if (partial ? elDesc.includes(descTarget) : elDesc === descTarget) {
          return el;
        }
      }
    }

    return null;
  }

  /**
   * Taps directly on an element found by text.
   */
  static async tapByText(serial: string, text: string): Promise<string> {
    const el = await this.findElement(serial, { text, partial: true });
    if (!el) {
      throw new Error(`Elemento com texto "${text}" não encontrado na tela atual.`);
    }

    const [x, y] = el.center;
    await AdbBridge.tap(serial, x, y);
    return `Toque realizado com sucesso no elemento "${el.text || text}" em (${x}, ${y})`;
  }

  /**
   * Taps directly on an element found by resource-id.
   */
  static async tapById(serial: string, id: string): Promise<string> {
    const el = await this.findElement(serial, { id, partial: true });
    if (!el) {
      throw new Error(`Elemento com resource-id "${id}" não encontrado na tela atual.`);
    }

    const [x, y] = el.center;
    await AdbBridge.tap(serial, x, y);
    return `Toque realizado no elemento ID "${el.id}" em (${x}, ${y})`;
  }

  /**
   * Taps directly on an element found by content description.
   */
  static async tapByDesc(serial: string, desc: string): Promise<string> {
    const el = await this.findElement(serial, { desc, partial: true });
    if (!el) {
      throw new Error(`Elemento com descrição "${desc}" não encontrado na tela atual.`);
    }

    const [x, y] = el.center;
    await AdbBridge.tap(serial, x, y);
    return `Toque realizado no elemento "${el.desc}" em (${x}, ${y})`;
  }

  /**
   * Raw coordinate tap.
   */
  static async tap(serial: string, x: number, y: number): Promise<void> {
    await AdbBridge.tap(serial, x, y);
  }

  /**
   * Types text into the currently active/focused field.
   */
  static async type(serial: string, text: string): Promise<void> {
    await AdbBridge.typeText(serial, text);
  }

  /**
   * Swipes in a specific cardinal direction or custom coordinates.
   */
  static async swipe(
    serial: string,
    direction: 'up' | 'down' | 'left' | 'right',
    durationMs: number = 300
  ): Promise<void> {
    const size = await AdbBridge.getScreenSize(serial);
    const width = size?.width || 1080;
    const height = size?.height || 2340;

    const midX = Math.round(width / 2);
    const midY = Math.round(height / 2);

    let startX = midX;
    let startY = midY;
    let endX = midX;
    let endY = midY;

    const deltaY = Math.round(height * 0.4);
    const deltaX = Math.round(width * 0.4);

    switch (direction) {
      case 'up':
        // Swipe UP moves content UP (scroll down)
        startY = midY + deltaY / 2;
        endY = midY - deltaY / 2;
        break;
      case 'down':
        // Swipe DOWN moves content DOWN (scroll up)
        startY = midY - deltaY / 2;
        endY = midY + deltaY / 2;
        break;
      case 'left':
        startX = midX + deltaX / 2;
        endX = midX - deltaX / 2;
        break;
      case 'right':
        startX = midX - deltaX / 2;
        endX = midX + deltaX / 2;
        break;
    }

    await AdbBridge.swipe(serial, startX, startY, endX, endY, durationMs);
  }

  /**
   * Hardware or navigation key press.
   */
  static async pressKey(
    serial: string,
    key: 'HOME' | 'BACK' | 'RECENTS' | 'ENTER' | 'POWER' | 'VOLUME_UP' | 'VOLUME_DOWN' | number
  ): Promise<void> {
    const keyMap: Record<string, number> = {
      HOME: 3,
      BACK: 4,
      RECENTS: 187,
      ENTER: 66,
      POWER: 26,
      VOLUME_UP: 24,
      VOLUME_DOWN: 25,
    };

    const code = typeof key === 'number' ? key : keyMap[key] || 4;
    await AdbBridge.keyEvent(serial, code);
  }

  /**
   * Launch an app by package name or alias.
   */
  static async launchApp(serial: string, packageOrAlias: string): Promise<string> {
    const pkg = this.resolvePackage(packageOrAlias);
    await AdbBridge.launchApp(serial, pkg);
    return `App ${pkg} iniciado no dispositivo ${serial}`;
  }

  /**
   * Force stop an app.
   */
  static async terminateApp(serial: string, packageOrAlias: string): Promise<string> {
    const pkg = this.resolvePackage(packageOrAlias);
    await AdbBridge.terminateApp(serial, pkg);
    return `App ${pkg} encerrado no dispositivo ${serial}`;
  }

  /**
   * Capture screenshot as PNG Buffer.
   */
  static async getScreenshotBuffer(serial: string): Promise<Buffer> {
    return AdbBridge.captureScreenshotBuffer(serial);
  }

  /**
   * Wake up device screen.
   */
  static async wakeUp(serial: string): Promise<void> {
    await AdbBridge.wakeUp(serial);
  }

  // --- XML Parsing Helpers ---

  private static parseXmlNodes(xml: string): UiNode[] {
    const nodeRegex = /<node\s+([^>]+)>/g;
    const nodes: UiNode[] = [];
    let match: RegExpExecArray | null;

    while ((match = nodeRegex.exec(xml)) !== null) {
      const attrsStr = match[1];
      const getAttr = (name: string): string => {
        const m = attrsStr.match(new RegExp(`${name}="([^"]*)"`));
        return m ? m[1] : '';
      };

      const boundsStr = getAttr('bounds');
      const bMatch = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (!bMatch) continue;

      const left = parseInt(bMatch[1], 10);
      const top = parseInt(bMatch[2], 10);
      const right = parseInt(bMatch[3], 10);
      const bottom = parseInt(bMatch[4], 10);

      const width = right - left;
      const height = bottom - top;
      const centerX = Math.round(left + width / 2);
      const centerY = Math.round(top + height / 2);

      nodes.push({
        text: getAttr('text') || undefined,
        resourceId: getAttr('resource-id') || undefined,
        className: getAttr('class') || undefined,
        packageName: getAttr('package') || undefined,
        contentDesc: getAttr('content-desc') || undefined,
        checkable: getAttr('checkable') === 'true',
        checked: getAttr('checked') === 'true',
        clickable: getAttr('clickable') === 'true',
        enabled: getAttr('enabled') === 'true',
        focusable: getAttr('focusable') === 'true',
        focused: getAttr('focused') === 'true',
        scrollable: getAttr('scrollable') === 'true',
        longClickable: getAttr('long-clickable') === 'true',
        bounds: {
          left,
          top,
          right,
          bottom,
          centerX,
          centerY,
          width,
          height,
        },
      });
    }

    return nodes;
  }
}
