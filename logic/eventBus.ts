type Listener = (payload?: any) => void;

class EventBus {
  private channels = new Map<string, Set<Listener>>();

  on(type: string, cb: Listener): () => void {
    const set = this.channels.get(type) ?? new Set<Listener>();
    set.add(cb);
    this.channels.set(type, set);
    return () => {
      set.delete(cb);
      if (set.size === 0) this.channels.delete(type);
    };
  }

  emit(type: string, payload?: any) {
    const set = this.channels.get(type);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try { cb(payload); } catch {}
    }
  }
}

export const events = new EventBus();

export const AppEvents = {
  PillConfigChanged: 'pillConfigChanged',
} as const;
