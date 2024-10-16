import React, { useEffect } from "react";

interface VideoProgressTrackerProps {
  videoRef: HTMLVideoElement | null;
  videoKey: string;
  onProgressUpdate: (progress: number) => void;
}

const VideoProgressTracker: React.FC<VideoProgressTrackerProps> = ({
  videoRef,
  videoKey,
  onProgressUpdate,
}) => {
  useEffect(() => {
    const updateProgress = () => {
      if (videoRef) {
        const currentTimeMs = videoRef.currentTime * 1000; // Convert to milliseconds
        onProgressUpdate(currentTimeMs);
      }
    };

    if (videoRef) {
      videoRef.addEventListener("timeupdate", updateProgress);
    }

    return () => {
      if (videoRef) {
        videoRef.removeEventListener("timeupdate", updateProgress);
      }
    };
  }, [videoRef, onProgressUpdate, videoKey]);

  return null; // This component doesn't render anything directly
};

export default VideoProgressTracker;