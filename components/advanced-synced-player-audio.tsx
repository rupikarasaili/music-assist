"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  ExpandIcon,
  Snail,
} from "lucide-react";
import { saveMediaToIndexedDB, getMediaFromIndexedDB } from "../indexedDBUtils";

// Mock data for tracks, sub-tracks, and videos
const tracks = [
  {
    id: "1",
    name: "Happy - Pharell Williams",
    videos: [
      {
        id: "v1",
        name: "Bass Cam",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/webmfiles/Happy Bass 1 Scroll score.webm"
        ),
      },
      {
        id: "v2",
        name: "Score Cam",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/webmfiles/Happy Video Bass 1.webm"
        ),
      },
    ],
    subTracks: [
      {
        id: "1-1",
        name: "Bass",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Bass 1.mp3"
        ),
      },
      {
        id: "1-2",
        name: "Komp",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Komp.mp3"
        ),
      },
      {
        id: "1-3",
        name: "Orchestra",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Orkester.mp3"
        ),
      },
      {
        id: "1-4",
        name: "Vocals",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Vocals.mp3"
        ),
      },
    ],
  },
];

interface AdvancedSyncedPlayerAudioProps {
  selectedFile?: string;
  onBackToDashboard: () => void;
}

const AdvancedSyncedPlayerAudio: React.FC<AdvancedSyncedPlayerAudioProps> = ({
  selectedFile,
  onBackToDashboard,
}) => {
  const [selectedTrack, setSelectedTrack] = useState(() => {
    if (selectedFile) {
      const track = tracks.find((t) =>
        t.subTracks.some((st) => st.file === selectedFile)
      );
      return track || tracks[0];
    }
    return tracks[0];
  });
  const [selectedVideo, setSelectedVideo] = useState(selectedTrack.videos[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1);
  const [subTrackVolumes, setSubTrackVolumes] = useState<
    Record<string, number>
  >({});
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [allMediaLoaded, setAllMediaLoaded] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<Record<string, number>>(
    {}
  );

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const initialVolumes: Record<string, number> = {};
    selectedTrack.subTracks.forEach((subTrack) => {
      initialVolumes[subTrack.id] = 1;
    });
    setSubTrackVolumes(initialVolumes);
  }, [selectedTrack]);

  useEffect(() => {
    const updateProgress = () => {
      const newProgress: Record<string, number> = {};

      Object.entries(videoRefs.current).forEach(([id, video]) => {
        if (video) {
          newProgress[id] = Math.round(video.currentTime * 1000);
        }
      });

      Object.entries(audioRefs.current).forEach(([id, audio]) => {
        if (audio) {
          newProgress[id] = Math.round(audio.currentTime * 1000);
        }
      });

      setMediaProgress(newProgress);
    };

    const intervalId = setInterval(updateProgress, 100);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const video = videoRefs.current[selectedVideo.id];
    if (video) {
      const updateDuration = () => {
        setDuration(video.duration || 0);
      };

      const updateProgress = () => {
        setProgress(video.currentTime / (video.duration || 1));
      };

      const handleLoadedMetadata = () => {
        updateDuration();
        setIsMediaReady(true);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", updateProgress);

      setProgress(0);
      setDuration(video.duration || 0);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", updateProgress);
      };
    }
  }, [selectedVideo]);

  useEffect(() => {
    const loadMedia = async () => {
      const videoPromises = selectedTrack.videos.map(async (video) => {
        const videoUrlBlob = await loadVideo(video.file);
        if (videoUrlBlob) {
          const videoElement = videoRefs.current[video.id];
          if (videoElement) {
            videoElement.src = videoUrlBlob;
            return new Promise<void>((resolve) => {
              videoElement.addEventListener(
                "loadedmetadata",
                () => {
                  resolve();
                },
                { once: true }
              );
            });
          }
        }
      });

      const audioPromises = selectedTrack.subTracks.map(async (subTrack) => {
        const audioUrlBlob = await loadAudio(subTrack.file);
        if (audioUrlBlob) {
          const audioElement = audioRefs.current[subTrack.id];
          if (audioElement) {
            audioElement.src = audioUrlBlob;
            return new Promise<void>((resolve) => {
              audioElement.addEventListener(
                "loadedmetadata",
                () => {
                  resolve();
                },
                { once: true }
              );
            });
          }
        }
      });

      await Promise.all([...videoPromises, ...audioPromises]);
      setIsBuffering(false);
      setAllMediaLoaded(true);
    };

    loadMedia();
  }, [selectedTrack]);

  const loadAudio = async (file: string) => {
    let audioBlob = await getMediaFromIndexedDB(file);

    if (!audioBlob) {
      try {
        const response = await fetch(file);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        const blob = await response.blob();
        await saveMediaToIndexedDB(file, blob);
        audioBlob = blob;
      } catch (error) {
        console.error("Error fetching audio:", error);
        return null;
      }
    }

    if (audioBlob) {
      const audioUrlBlob = URL.createObjectURL(audioBlob);
      return audioUrlBlob;
    }

    return null;
  };

  const loadVideo = async (videoUrl: string) => {
    let videoBlob = await getMediaFromIndexedDB(videoUrl);

    if (!videoBlob) {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const blob = await response.blob();
        await saveMediaToIndexedDB(videoUrl, blob);
        videoBlob = blob;
      } catch (error) {
        console.error("Error fetching video:", error);
        return null;
      }
    }

    if (videoBlob) {
      const videoUrlBlob = URL.createObjectURL(videoBlob);
      return videoUrlBlob;
    }

    return null;
  };

  const playMedia = () => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.play();
      }
    });
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.play();
      }
    });
    setIsPlaying(true);
  };

  const pauseMedia = () => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
      }
    });
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
      }
    });
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseMedia();
    } else {
      playMedia();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackRate(newSpeed);
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.playbackRate = newSpeed;
      }
    });
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.playbackRate = newSpeed;
      }
    });
  };

  const handleMasterVolumeChange = (newVolume: number) => {
    setMasterVolume(newVolume);
    Object.entries(subTrackVolumes).forEach(([subTrackId, subTrackVolume]) => {
      const audio = audioRefs.current[subTrackId];
      if (audio) {
        audio.volume = subTrackVolume * newVolume;
      }
    });
  };

  const handleSubTrackVolumeChange = (
    subTrackId: string,
    newVolume: number
  ) => {
    setSubTrackVolumes((prev) => ({ ...prev, [subTrackId]: newVolume }));
    const audio = audioRefs.current[subTrackId];
    if (audio) {
      audio.volume = newVolume * masterVolume;
    }
  };

  const switchVideo = (videoId: string) => {
    const currentVideo = videoRefs.current[selectedVideo.id];
    const newVideo = selectedTrack.videos.find((v) => v.id === videoId);

    if (newVideo && currentVideo) {
      currentVideo.pause();
      const currentTime = currentVideo.currentTime;
      setSelectedVideo(newVideo);

      const newVideoElement = videoRefs.current[videoId];
      if (newVideoElement) {
        newVideoElement.currentTime = currentTime;
        if (isPlaying) {
          newVideoElement.play();
        }
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleProgressChange = (newProgress: number) => {
    setProgress(newProgress);
    const newTime = newProgress * duration;
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.currentTime = newTime;
      }
    });
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.currentTime = newTime;
      }
    });
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateDifferences = () => {
    const videoTimes = selectedTrack.videos.map(
      (v) => mediaProgress[v.id] || 0
    );
    const audioTimes = selectedTrack.subTracks.map(
      (a) => mediaProgress[a.id] || 0
    );

    const videoDiff = Math.abs(videoTimes[0] - videoTimes[1]);
    const maxAudioDiff = Math.max(...audioTimes) - Math.min(...audioTimes);
    const overallDiff =
      Math.max(...videoTimes, ...audioTimes) -
      Math.min(...videoTimes, ...audioTimes);

    return { videoDiff, maxAudioDiff, overallDiff };
  };

  const { videoDiff, maxAudioDiff, overallDiff } = calculateDifferences();

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen bg-black overflow-hidden ${
        isBuffering ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {selectedTrack.videos.map((video) => (
        <video
          key={video.id}
          ref={(el) => {
            videoRefs.current[video.id] = el;
          }}
          className={`absolute inset-0 w-full h-full object-cover ${
            video.id === selectedVideo.id ? "block" : "hidden"
          }`}
          playsInline
        />
      ))}

      {selectedTrack.subTracks.map((subTrack) => (
        <audio
          key={subTrack.id}
          ref={(el) => {
            audioRefs.current[subTrack.id] = el;
          }}
        />
      ))}

      <div className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded text-white text-sm">
        <div>Videos:</div>
        {selectedTrack.videos.map((video) => (
          <div key={video.id}>
            {video.name}: {mediaProgress[video.id] || 0} ms
          </div>
        ))}
        <div>Audios:</div>
        {selectedTrack.subTracks.map((audio) => (
          <div key={audio.id}>
            {audio.name}: {mediaProgress[audio.id] || 0} ms
          </div>
        ))}
        <div>Differences:</div>
        <div>Video diff: {videoDiff} ms</div>
        <div>Max audio diff: {maxAudioDiff} ms</div>
        <div>Overall diff: {overallDiff} ms</div>
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">
              {formatTime(progress * duration)}
            </span>
            <Slider
              className="flex-1"
              min={0}
              max={1}
              step={0.001}
              value={[progress]}
              onValueChange={([value]) => handleProgressChange(value)}
            />
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={togglePlayPause}
              variant="outline"
              size="icon"
              disabled={!isMediaReady || !allMediaLoaded}
            >
              {isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </Button>
            <div className="flex items-center space-x-2 flex-1">
              <Volume2Icon className="h-4 w-4 text-white" />
              <Slider
                className="w-24"
                min={0}
                max={1}
                step={0.01}
                value={[masterVolume]}
                onValueChange={([value]) => handleMasterVolumeChange(value)}
              />
            </div>
            <Snail className="size-4 text-white" />
            <div className="flex gap-x-2">
              <Slider
                className="w-48"
                min={0.25}
                max={2}
                step={0.25}
                value={[playbackRate]}
                onValueChange={([value]) => handleSpeedChange(value)}
              />
              <span className="w-10 text-sm text-white text-center">
                {playbackRate.toFixed(2) + "x"}
              </span>
            </div>
            <Button onClick={toggleFullscreen} variant="outline" size="icon">
              <ExpandIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex space-x-4">
            <Select
              value={selectedTrack.id}
              onValueChange={(value) =>
                setSelectedTrack(tracks.find((t) => t.id === value)!)
              }
            >
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a track" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              {selectedTrack.videos.map((video) => (
                <Button
                  key={video.id}
                  variant={
                    video.id === selectedVideo.id ? "default" : "outline"
                  }
                  onClick={() => switchVideo(video.id)}
                  size="sm"
                >
                  {video.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex space-x-4 bg-black/50 p-4 rounded-lg w-max">
            {selectedTrack.subTracks.map((subTrack) => (
              <div
                key={subTrack.id}
                className="flex flex-col items-center space-y-2"
              >
                <label htmlFor={subTrack.id} className="text-white text-sm">
                  {subTrack.name}
                </label>
                <Slider
                  id={subTrack.id}
                  className="w-24"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[subTrackVolumes[subTrack.id] || 0]}
                  onValueChange={([value]) =>
                    handleSubTrackVolumeChange(subTrack.id, value)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button
        onClick={onBackToDashboard}
        className="absolute top-4 left-4 z-10"
        variant="outline"
      >
        Back to Dashboard
      </Button>
    </div>
  );
};

export default AdvancedSyncedPlayerAudio;
