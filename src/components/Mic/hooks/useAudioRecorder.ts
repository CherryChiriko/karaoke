import { useState, useRef, useEffect } from "react";

export const useAudioRecorder = (
  isMicEnabled: boolean,
  setIsMicEnabled: (enabled: boolean) => void,
) => {
  const [micVolume, setMicVolume] = useState<number>(0);
  const [micStatusLog, setMicStatusLog] = useState<string>(
    "VIRTUAL FEEDBACK READY",
  );

  // Audio Context Ref structure
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Use a synced ref to avoid stale state closures inside animation frames
  const isMicEnabledRef = useRef(isMicEnabled);
  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  // Clean up hardware resources on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Physically activate raw microphone input using browser AudioContext
  const startMicNode = async () => {
    try {
      setMicStatusLog("INITIALIZING MICROPHONE...");
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      // Resume context if browser suspended it (standard requirement)
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicEnabled(true);
      setMicStatusLog("MICROPHONE LEVEL RAW CHANNEL ACTIVE");

      // Continuously measure input volume
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current || !isMicEnabledRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const val = Math.min(100, Math.round((sum / bufferLength) * 1.8));
        setMicVolume(val);

        requestAnimationFrame(updateVolume);
      };

      // Delay briefly to allow standard stream binding state transitions
      setTimeout(updateVolume, 50);
    } catch (err: any) {
      console.warn("Microphone permissions rejected or unavailable:", err);
      setMicStatusLog(
        `MIC ERROR: UNABLE TO BIND RAW CAPTURE (${err.message || "Permission denied"})`,
      );
      setIsMicEnabled(false);
    }
  };

  const stopMicNode = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    analyserRef.current = null;
    setIsMicEnabled(false);
    setMicVolume(0);
    setMicStatusLog("MICROPHONE CHANNEL DISCONNECTED");
  };

  return {
    micVolume,
    micStatusLog,
    analyser: analyserRef.current,
    audioContext: audioCtxRef.current,
    startMicNode,
    stopMicNode,
  };
};
