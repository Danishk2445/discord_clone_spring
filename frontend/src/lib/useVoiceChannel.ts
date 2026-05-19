"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendVoiceJoin,
  sendVoiceLeave,
  sendVoiceSignal,
  sendVoiceStateUpdate,
  subscribeRealtime,
} from "./realtime";
import type { VoiceMember, WsEvent } from "./types";

export type LocalVoiceState = {
  joined: boolean;
  joining: boolean;
  error: string | null;
  muted: boolean;
  deafened: boolean;
  members: Map<string, VoiceMember>;
  speakingUserIds: Set<string>;
};

type SignalPayload =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const SPEAKING_THRESHOLD = 0.05;
const SPEAKING_RELEASE_MS = 300;
const SPEAKING_WARMUP_MS = 400;

function rmsFromTimeDomain(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function useVoiceChannel(
  channelId: string,
  selfId: string,
): {
  state: LocalVoiceState;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
} {
  const [state, setState] = useState<LocalVoiceState>({
    joined: false,
    joining: false,
    error: null,
    muted: false,
    deafened: false,
    members: new Map(),
    speakingUserIds: new Set(),
  });

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const analyzersRef = useRef<
    Map<string, { ctx: AudioContext; analyser: AnalyserNode; raf: number }>
  >(new Map());
  const speakingTimersRef = useRef<Map<string, number>>(new Map());
  const joinedRef = useRef(false);
  const mutedRef = useRef(false);
  const deafenedRef = useRef(false);
  const channelIdRef = useRef(channelId);
  const selfIdRef = useRef(selfId);

  useEffect(() => {
    channelIdRef.current = channelId;
    selfIdRef.current = selfId;
  }, [channelId, selfId]);

  const setMember = useCallback((member: VoiceMember) => {
    setState((prev) => {
      const members = new Map(prev.members);
      members.set(member.userId, member);
      return { ...prev, members };
    });
  }, []);

  const removeMember = useCallback((userId: string) => {
    setState((prev) => {
      if (!prev.members.has(userId)) return prev;
      const members = new Map(prev.members);
      members.delete(userId);
      const speakingUserIds = new Set(prev.speakingUserIds);
      speakingUserIds.delete(userId);
      return { ...prev, members, speakingUserIds };
    });
  }, []);

  const setSpeaking = useCallback((userId: string, speaking: boolean) => {
    setState((prev) => {
      const has = prev.speakingUserIds.has(userId);
      if (has === speaking) return prev;
      const next = new Set(prev.speakingUserIds);
      if (speaking) next.add(userId);
      else next.delete(userId);
      return { ...prev, speakingUserIds: next };
    });
  }, []);

  const teardownPeer = useCallback((userId: string) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
      } catch {
        /* ignore */
      }
      peersRef.current.delete(userId);
    }
    const audio = audioElementsRef.current.get(userId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch {
        /* ignore */
      }
      audioElementsRef.current.delete(userId);
    }
    remoteStreamsRef.current.delete(userId);
    const meter = analyzersRef.current.get(userId);
    if (meter) {
      cancelAnimationFrame(meter.raf);
      meter.ctx.close().catch(() => undefined);
      analyzersRef.current.delete(userId);
    }
  }, []);

  const attachSpeakingMeter = useCallback(
    (userId: string, stream: MediaStream) => {
      const existing = analyzersRef.current.get(userId);
      if (existing) {
        cancelAnimationFrame(existing.raf);
        existing.ctx.close().catch(() => undefined);
        analyzersRef.current.delete(userId);
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let displayedSpeaking = false;
      const isSelf = userId === selfIdRef.current;
      const startedAt = performance.now();
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        const rms = rmsFromTimeDomain(buf);
        const selfMuted = isSelf && mutedRef.current;
        const warming = performance.now() - startedAt < SPEAKING_WARMUP_MS;
        const rawSpeaking =
          !selfMuted && !warming && rms > SPEAKING_THRESHOLD;
        if (rawSpeaking) {
          const pending = speakingTimersRef.current.get(userId);
          if (pending) {
            window.clearTimeout(pending);
            speakingTimersRef.current.delete(userId);
          }
          if (!displayedSpeaking) {
            displayedSpeaking = true;
            setSpeaking(userId, true);
            if (isSelf) {
              sendVoiceStateUpdate(channelIdRef.current, { speaking: true });
            }
          }
        } else if (displayedSpeaking && !speakingTimersRef.current.has(userId)) {
          const timer = window.setTimeout(() => {
            speakingTimersRef.current.delete(userId);
            displayedSpeaking = false;
            setSpeaking(userId, false);
            if (isSelf) {
              sendVoiceStateUpdate(channelIdRef.current, { speaking: false });
            }
          }, SPEAKING_RELEASE_MS);
          speakingTimersRef.current.set(userId, timer);
        }
        const raf = requestAnimationFrame(tick);
        const stored = analyzersRef.current.get(userId);
        if (stored) stored.raf = raf;
      };
      const raf = requestAnimationFrame(tick);
      analyzersRef.current.set(userId, { ctx, analyser, raf });
    },
    [setSpeaking],
  );

  const createPeer = useCallback(
    (remoteUserId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(remoteUserId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(remoteUserId, pc);

      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getTracks()) {
          pc.addTrack(track, local);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendVoiceSignal(channelIdRef.current, remoteUserId, {
            kind: "ice",
            candidate: e.candidate.toJSON(),
          } satisfies SignalPayload);
        }
      };

      pc.ontrack = (e) => {
        let stream = remoteStreamsRef.current.get(remoteUserId);
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current.set(remoteUserId, stream);
        }
        for (const track of e.streams[0]?.getTracks() ?? [e.track]) {
          if (!stream.getTracks().find((t) => t.id === track.id)) {
            stream.addTrack(track);
          }
        }
        let audio = audioElementsRef.current.get(remoteUserId);
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          audio.muted = deafenedRef.current;
          audioElementsRef.current.set(remoteUserId, audio);
        }
        if (audio.srcObject !== stream) audio.srcObject = stream;
        audio.play().catch(() => undefined);
        attachSpeakingMeter(remoteUserId, stream);
      };

      return pc;
    },
    [attachSpeakingMeter],
  );

  const offerTo = useCallback(
    async (remoteUserId: string) => {
      const pc = createPeer(remoteUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendVoiceSignal(channelIdRef.current, remoteUserId, {
        kind: "offer",
        sdp: offer,
      } satisfies SignalPayload);
    },
    [createPeer],
  );

  const handleSignal = useCallback(
    async (fromUserId: string, raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const payload = raw as SignalPayload;
      if (payload.kind === "offer") {
        const pc = createPeer(fromUserId);
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendVoiceSignal(channelIdRef.current, fromUserId, {
          kind: "answer",
          sdp: answer,
        } satisfies SignalPayload);
        return;
      }
      if (payload.kind === "answer") {
        const pc = peersRef.current.get(fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(payload.sdp);
        return;
      }
      if (payload.kind === "ice") {
        const pc = peersRef.current.get(fromUserId);
        if (!pc) return;
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* ignore */
        }
        return;
      }
    },
    [createPeer],
  );

  const cleanup = useCallback(() => {
    for (const userId of Array.from(peersRef.current.keys())) {
      teardownPeer(userId);
    }
    for (const meter of analyzersRef.current.values()) {
      cancelAnimationFrame(meter.raf);
      meter.ctx.close().catch(() => undefined);
    }
    analyzersRef.current.clear();
    const local = localStreamRef.current;
    if (local) {
      for (const track of local.getTracks()) track.stop();
      localStreamRef.current = null;
    }
    for (const timer of speakingTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    speakingTimersRef.current.clear();
  }, [teardownPeer]);

  const leave = useCallback(() => {
    if (!joinedRef.current) return;
    joinedRef.current = false;
    sendVoiceLeave(channelIdRef.current);
    cleanup();
    setState({
      joined: false,
      joining: false,
      error: null,
      muted: false,
      deafened: false,
      members: new Map(),
      speakingUserIds: new Set(),
    });
  }, [cleanup]);

  const join = useCallback(async () => {
    if (joinedRef.current) return;
    setState((s) => ({ ...s, joining: true, error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });
      localStreamRef.current = stream;
      joinedRef.current = true;
      setState((s) => ({ ...s, joining: false, joined: true }));
      attachSpeakingMeter(selfIdRef.current, stream);
      sendVoiceJoin(channelIdRef.current);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "microphone_unavailable";
      setState((s) => ({ ...s, joining: false, error: message }));
    }
  }, [attachSpeakingMeter]);

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const next = !prev.muted;
      mutedRef.current = next;
      const local = localStreamRef.current;
      if (local) {
        for (const track of local.getAudioTracks()) track.enabled = !next;
      }
      if (joinedRef.current) {
        sendVoiceStateUpdate(channelIdRef.current, { muted: next });
      }
      return { ...prev, muted: next };
    });
  }, []);

  const toggleDeafen = useCallback(() => {
    setState((prev) => {
      const next = !prev.deafened;
      deafenedRef.current = next;
      for (const audio of audioElementsRef.current.values()) {
        audio.muted = next;
      }
      const local = localStreamRef.current;
      const newMuted = next ? true : prev.muted;
      if (local) {
        for (const track of local.getAudioTracks()) track.enabled = !newMuted;
      }
      mutedRef.current = newMuted;
      if (joinedRef.current) {
        sendVoiceStateUpdate(channelIdRef.current, {
          deafened: next,
          muted: newMuted,
        });
      }
      return { ...prev, deafened: next, muted: newMuted };
    });
  }, []);

  useEffect(() => {
    const unsub = subscribeRealtime((event: WsEvent) => {
      if (!joinedRef.current) return;
      if (event.type === "voice:joined") {
        if (event.channelId !== channelIdRef.current) return;
        const members = new Map<string, VoiceMember>();
        for (const m of event.members) members.set(m.userId, m);
        setState((s) => ({ ...s, members }));
        for (const m of event.members) {
          if (m.userId !== event.selfUserId) {
            void offerTo(m.userId);
          }
        }
        return;
      }
      if (event.type === "voice:peer_join") {
        if (event.channelId !== channelIdRef.current) return;
        setMember(event.member);
        return;
      }
      if (event.type === "voice:peer_leave") {
        if (event.channelId !== channelIdRef.current) return;
        teardownPeer(event.userId);
        removeMember(event.userId);
        return;
      }
      if (event.type === "voice:peer_update") {
        if (event.channelId !== channelIdRef.current) return;
        setMember(event.member);
        return;
      }
      if (event.type === "voice:signal") {
        if (event.channelId !== channelIdRef.current) return;
        void handleSignal(event.fromUserId, event.payload);
        return;
      }
      if (event.type === "voice:kicked") {
        if (event.channelId !== channelIdRef.current) return;
        cleanup();
        joinedRef.current = false;
        setState({
          joined: false,
          joining: false,
          error: "joined_elsewhere",
          muted: false,
          deafened: false,
          members: new Map(),
          speakingUserIds: new Set(),
        });
        return;
      }
      if (event.type === "voice:error") {
        if (event.channelId !== channelIdRef.current) return;
        cleanup();
        joinedRef.current = false;
        setState((s) => ({
          ...s,
          joined: false,
          joining: false,
          error: event.error,
        }));
        return;
      }
    });
    return unsub;
  }, [
    offerTo,
    handleSignal,
    teardownPeer,
    setMember,
    removeMember,
    cleanup,
  ]);

  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        sendVoiceLeave(channelIdRef.current);
      }
      cleanup();
      joinedRef.current = false;
    };
  }, [cleanup]);

  useEffect(() => {
    if (!joinedRef.current) return;
    if (channelIdRef.current === channelId) return;
    leave();
  }, [channelId, leave]);

  return { state, join, leave, toggleMute, toggleDeafen };
}
