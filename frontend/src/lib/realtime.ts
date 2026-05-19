import { API_BASE } from "./api-base";
import type {
  PendingDmCall,
  VoiceMember,
  VoiceStateMap,
  WsEvent,
} from "./types";

type Listener = (event: WsEvent) => void;
type VoiceStateListener = (states: VoiceStateMap) => void;
type PendingCallsListener = (calls: PendingDmCall[]) => void;

let socket: WebSocket | null = null;
let connecting = false;
const listeners = new Set<Listener>();
const voiceStateListeners = new Set<VoiceStateListener>();
const pendingCallsListeners = new Set<PendingCallsListener>();
const queued: string[] = [];

let voiceStates: VoiceStateMap = {};
let pendingCalls: PendingDmCall[] = [];
const declinedCalls = new Set<string>();

const TYPING_THROTTLE_MS = 3500;
const lastTypingSent = new Map<string, number>();

function notifyVoiceListeners() {
  for (const l of voiceStateListeners) l(voiceStates);
}

function notifyPendingCallsListeners() {
  for (const l of pendingCallsListeners) l(pendingCalls);
}

function setPendingCalls(next: PendingDmCall[]) {
  pendingCalls = next.filter((c) => !declinedCalls.has(c.dmId));
  notifyPendingCallsListeners();
}

function applyVoiceEvent(event: WsEvent) {
  switch (event.type) {
    case "hello": {
      voiceStates = event.voiceStates ?? {};
      notifyVoiceListeners();
      setPendingCalls(event.pendingDmCalls ?? []);
      return;
    }
    case "call:incoming": {
      const filtered = pendingCalls.filter((c) => c.dmId !== event.dmId);
      setPendingCalls([
        ...filtered,
        {
          dmId: event.dmId,
          callerId: event.callerId,
          startedAt: event.startedAt,
        },
      ]);
      return;
    }
    case "call:ended": {
      declinedCalls.delete(event.dmId);
      setPendingCalls(pendingCalls.filter((c) => c.dmId !== event.dmId));
      return;
    }
    case "voice:joined": {
      voiceStates = { ...voiceStates, [event.channelId]: event.members };
      notifyVoiceListeners();
      return;
    }
    case "voice:peer_join": {
      const list = voiceStates[event.channelId] ?? [];
      const filtered = list.filter((m) => m.userId !== event.member.userId);
      voiceStates = {
        ...voiceStates,
        [event.channelId]: [...filtered, event.member],
      };
      notifyVoiceListeners();
      return;
    }
    case "voice:peer_leave": {
      const list = voiceStates[event.channelId];
      if (!list) return;
      const next = list.filter((m) => m.userId !== event.userId);
      if (next.length === 0) {
        const copy = { ...voiceStates };
        delete copy[event.channelId];
        voiceStates = copy;
      } else {
        voiceStates = { ...voiceStates, [event.channelId]: next };
      }
      notifyVoiceListeners();
      return;
    }
    case "voice:peer_update": {
      const list = voiceStates[event.channelId];
      if (!list) return;
      const next = list.map((m) =>
        m.userId === event.member.userId ? event.member : m,
      );
      voiceStates = { ...voiceStates, [event.channelId]: next };
      notifyVoiceListeners();
      return;
    }
    default:
      return;
  }
}

function flushQueue() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  while (queued.length > 0) {
    const payload = queued.shift();
    if (payload) socket.send(payload);
  }
}

function sendOrQueue(payload: object) {
  const text = JSON.stringify(payload);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(text);
  } else {
    queued.push(text);
    ensureConnection();
  }
}

function ensureConnection() {
  if (typeof window === "undefined") return;
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }
  if (connecting) return;
  connecting = true;

  const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws";
  const ws = new WebSocket(wsUrl);
  socket = ws;

  ws.addEventListener("open", () => {
    connecting = false;
    flushQueue();
  });
  ws.addEventListener("message", (e) => {
    try {
      const data = JSON.parse(e.data as string) as WsEvent;
      applyVoiceEvent(data);
      for (const l of listeners) l(data);
    } catch {
      /* ignore */
    }
  });
  ws.addEventListener("close", () => {
    connecting = false;
    socket = null;
  });
  ws.addEventListener("error", () => {
    connecting = false;
  });
}

export function subscribeRealtime(listener: Listener) {
  ensureConnection();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeVoiceState(listener: VoiceStateListener) {
  ensureConnection();
  voiceStateListeners.add(listener);
  listener(voiceStates);
  return () => {
    voiceStateListeners.delete(listener);
  };
}

export function subscribePendingCalls(listener: PendingCallsListener) {
  ensureConnection();
  pendingCallsListeners.add(listener);
  listener(pendingCalls);
  return () => {
    pendingCallsListeners.delete(listener);
  };
}

export function declineIncomingCall(dmId: string) {
  declinedCalls.add(dmId);
  setPendingCalls(pendingCalls);
}

export function getVoiceChannelMembers(channelId: string): VoiceMember[] {
  return voiceStates[channelId] ?? [];
}

export function sendTyping(channelId: string) {
  if (typeof window === "undefined") return;
  ensureConnection();
  const now = Date.now();
  const last = lastTypingSent.get(channelId) ?? 0;
  if (now - last < TYPING_THROTTLE_MS) return;
  lastTypingSent.set(channelId, now);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "typing", channelId }));
  }
}

export function sendVoiceJoin(channelId: string) {
  sendOrQueue({ type: "voice:join", channelId });
}

export function sendVoiceLeave(channelId: string) {
  sendOrQueue({ type: "voice:leave", channelId });
}

export function sendVoiceSignal(
  channelId: string,
  targetUserId: string,
  payload: unknown,
) {
  sendOrQueue({
    type: "voice:signal",
    channelId,
    targetUserId,
    payload,
  });
}

export function sendVoiceStateUpdate(
  channelId: string,
  patch: { muted?: boolean; deafened?: boolean; speaking?: boolean },
) {
  sendOrQueue({ type: "voice:state", channelId, ...patch });
}
