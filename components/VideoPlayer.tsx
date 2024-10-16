import React, { useEffect, useState } from "react";

interface VideoProgressTrackerProps {
  videoRef: HTMLVideoElement | null;
  audioRef: Howl | null;
  videoKey: string;
  onProgressUpdate: (progress: number) => void;
}

interface NetworkStats {
  video: number;
  audio: number;
}

const VideoProgressTracker: React.FC<VideoProgressTrackerProps> = ({
  videoRef,
  audioRef,
  videoKey,
  onProgressUpdate,
}) => {
  const [networkStats, setNetworkStats] = useState<NetworkStats>({ video: 0, audio: 0 });

  useEffect(() => {
    const updateProgress = () => {
      if (videoRef) {
        const currentTimeMs = videoRef.currentTime * 1000; // Convert to milliseconds
        onProgressUpdate(currentTimeMs);
      }
    };

    const updateNetworkStats = () => {
      if (videoRef) {
        // Get video buffered data
        const videoBuffered = videoRef.buffered;
        if (videoBuffered.length > 0) {
          const videoBufferedEnd = videoBuffered.end(videoBuffered.length - 1);
          setNetworkStats(prev => ({ ...prev, video: videoBufferedEnd * 1000 }));
        }
      }

      if (audioRef) {
        // Get audio buffered data (assuming Howler.js exposes this information)
        const audioBuffered = audioRef.duration() * audioRef.seek();
        setNetworkStats(prev => ({ ...prev, audio: audioBuffered * 1000 }));
      }
    };

    if (videoRef) {
      videoRef.addEventListener("timeupdate", updateProgress);
      videoRef.addEventListener("progress", updateNetworkStats);
    }

    if (audioRef) {
      audioRef.on("load", updateNetworkStats);
    }

    return () => {
      if (videoRef) {
        videoRef.removeEventListener("timeupdate", updateProgress);
        videoRef.removeEventListener("progress", updateNetworkStats);
      }
      if (audioRef) {
        audioRef.off("load", updateNetworkStats);
      }
    };
  }, [videoRef, audioRef, onProgressUpdate, videoKey]);

  return (
    <div className="absolute top-2 left-2 text-sm z-10">
      <div className="bg-blue-500/50 px-2 py-1 rounded mb-1">
        Video loaded: {Math.floor(networkStats.video)} ms
      </div>
      <div className="bg-green-500/50 px-2 py-1 rounded">
        Audio loaded: {Math.floor(networkStats.audio)} ms
      </div>
    </div>
  );
};

export default VideoProgressTracker;