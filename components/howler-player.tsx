"use client";

import React, { useState, useRef, useEffect } from "react";
import { Howl } from "howler";
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
import VideoProgressTracker from "./VideoPlayer";

// Reuse the tracks data from the original component
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

interface HowlerPlayerProps {
  selectedFile?: string;
  onBackToDashboard: () => void;
}

const HowlerPlayer: React.FC<HowlerPlayerProps> = ({
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
  const [subTrackVolumes, setSubTrackVolumes] = useState<{
    [key: string]: number;
  }>({});
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({}); // To store the progress in ms for each video

  const howlsRef = useRef<{ [key: string]: Howl }>({});
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Track when media is ready
  const [mediaLoaded, setMediaLoaded] = useState({
    video: false,
    audio: false,
  });

  useEffect(() => {
    const initialVolumes: Record<string, number> = {};
    selectedTrack.subTracks.forEach((subTrack) => {
      initialVolumes[subTrack.id] = 1;
    });
    setSubTrackVolumes(initialVolumes);

    // Load Howl instances for each subTrack (audio)
    let audioReadyCount = 0;
    const totalAudioTracks = selectedTrack.subTracks.length;

    selectedTrack.subTracks.forEach((subTrack) => {
      const howl = new Howl({
        src: [subTrack.file],
        html5: true,
        preload: true,
        onload: () => {
          audioReadyCount++;
          console.log(`${subTrack.name} audio loaded`);
          if (audioReadyCount === totalAudioTracks) {
            setMediaLoaded((prev) => ({ ...prev, audio: true }));
            console.log("All audio files are loaded");
          }
        },
      });
      howlsRef.current[subTrack.id] = howl;
    });

    // Load video progress and metadata
    selectedTrack.videos.forEach((video) => {
      const videoElement = videoRefs.current[video.id];
      if (videoElement) {
        console.log(`Starting to load video: ${video.name}`);

        const updateDuration = () => {
          console.log(`Video metadata loaded for: ${video.name}`);
          setMediaLoaded((prev) => ({ ...prev, video: true }));
        };

        const logLoadProgress = () => {
          if (videoElement.buffered.length > 0) {
            const bufferedEnd = videoElement.buffered.end(
              videoElement.buffered.length - 1
            );
            const bufferMs = bufferedEnd * 1000; // Convert to milliseconds
            setVideoProgress((prevProgress) => ({
              ...prevProgress,
              [video.id]: bufferMs,
            }));
          }
        };

        videoElement.addEventListener("loadedmetadata", updateDuration);
        videoElement.addEventListener("progress", logLoadProgress);

        return () => {
          videoElement.removeEventListener("loadedmetadata", updateDuration);
          videoElement.removeEventListener("progress", logLoadProgress);
        };
      }
    });

    // Cleanup Howl instances when the component unmounts
    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
    };
  }, [selectedTrack]);

  useEffect(() => {
    const video = videoRefs.current[selectedVideo.id];
    if (video) {
      console.log(`Starting to load video: ${selectedVideo.name}`);

      const updateDuration = () => {
        console.log(`Video metadata loaded for: ${selectedVideo.name}`);
        setDuration(video.duration || 0);
        setMediaLoaded((prev) => ({ ...prev, video: true }));
      };

      const updateProgress = () => {
        setProgress(video.currentTime / (video.duration || 1));
      };

      video.addEventListener("loadedmetadata", updateDuration);
      video.addEventListener("timeupdate", updateProgress);

      return () => {
        video.removeEventListener("loadedmetadata", updateDuration);
        video.removeEventListener("timeupdate", updateProgress);
      };
    }
  }, [selectedVideo]);

  // Enable play button only when both audio and video are loaded
  useEffect(() => {
    console.log("Current mediaLoaded state:", mediaLoaded);
    if (mediaLoaded.audio && mediaLoaded.video) {
      setIsReady(true);
      console.log("All media (audio and video) are fully loaded and ready to play.");
    }
  }, [mediaLoaded]);

  const playAudio = () => {
    Object.entries(howlsRef.current).forEach(([subTrackId, howl]) => {
      howl.rate(playbackRate);
      howl.volume(subTrackVolumes[subTrackId] * masterVolume);
      howl.play();
    });

    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.playbackRate = playbackRate;
        video.play();
      }
    });

    setIsPlaying(true);
    startProgressInterval();
  };

  const pauseAudio = () => {
    Object.values(howlsRef.current).forEach((howl) => howl.pause());
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
      }
    });

    setIsPlaying(false);
    stopProgressInterval();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackRate(newSpeed);
    Object.values(howlsRef.current).forEach((howl) => howl.rate(newSpeed));
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.playbackRate = newSpeed;
      }
    });
  };

  const handleMasterVolumeChange = (newVolume: number) => {
    setMasterVolume(newVolume);
    Object.entries(howlsRef.current).forEach(([subTrackId, howl]) => {
      howl.volume(subTrackVolumes[subTrackId] * newVolume);
    });
  };

  const handleSubTrackVolumeChange = (
    subTrackId: string,
    newVolume: number
  ) => {
    setSubTrackVolumes((prev) => ({ ...prev, [subTrackId]: newVolume }));
    const howl = howlsRef.current[subTrackId];
    if (howl) {
      howl.volume(newVolume * masterVolume);
    }
  };

  const switchVideo = (videoId: string) => {
    const newVideo = selectedTrack.videos.find((v) => v.id === videoId);
    if (newVideo) {
      setSelectedVideo(newVideo);
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
    const seekTime = newProgress * duration;
    Object.values(howlsRef.current).forEach((howl) => howl.seek(seekTime));
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.currentTime = seekTime;
      }
    });
  };

  const startProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = window.setInterval(() => {
      const video = videoRefs.current[selectedVideo.id];
      if (video) {
        setProgress(video.currentTime / video.duration);
      }
    }, 1000 / 30); // Update 30 times per second
  };

  const stopProgressInterval = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
      {selectedTrack.videos.map((video, index) => (
        <div key={video.id} style={{ marginBottom: "20px", position: "relative" }}>
          <video
            ref={(el) => {
              videoRefs.current[video.id] = el;
            }}
            src={video.file}
            style={{ width: "100%", height: "auto" }}
            controls
            playsInline
          />
          {/* Overlay for showing buffered progress in ms */}
          <VideoProgressTracker
            videoRef={videoRefs.current[video.id]}
            videoKey={video.id}
            onProgressUpdate={(progress) => updateVideoProgress(video.id, progress)}
          />
          </div>
      ))}

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">{formatTime(progress * duration)}</span>
            <Slider className="flex-1" min={0} max={1} step={0.001} value={[progress]} onValueChange={([value]) => handleProgressChange(value)} />
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={togglePlayPause} variant="outline" size="icon" disabled={!isReady}>
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </Button>
            <div className="flex items-center space-x-2 flex-1">
              <Volume2Icon className="h-4 w-4 text-white" />
              <Slider className="w-24" min={0} max={1} step={0.01} value={[masterVolume]} onValueChange={([value]) => handleMasterVolumeChange(value)} />
            </div>
            <Snail className="size-4 text-white" />
            <div className="flex gap-x-2">
              <Slider className="w-48" min={0.25} max={2} step={0.25} value={[playbackRate]} onValueChange={([value]) => handleSpeedChange(value)} />
              <span className="w-10 text-sm text-white text-center">{playbackRate.toFixed(2) + "x"}</span>
            </div>
            <Button onClick={toggleFullscreen} variant="outline" size="icon">
              <ExpandIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex space-x-4">
            <Select value={selectedTrack.id} onValueChange={(value) => setSelectedTrack(tracks.find((t) => t.id === value)!)}>
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
                <Button key={video.id} variant={video.id === selectedVideo.id ? "default" : "outline"} onClick={() => switchVideo(video.id)} size="sm">
                  {video.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex space-x-4 bg-black/50 p-4 rounded-lg w-max">
            {selectedTrack.subTracks.map((subTrack) => (
              <div key={subTrack.id} className="flex flex-col items-center space-y-2">
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
                  onValueChange={([value]) => handleSubTrackVolumeChange(subTrack.id, value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* <Button onClick={onBackToDashboard} className="absolute top-4 left-4 z-10" variant="outline">
        Back to Dashboard
      </Button> */}
    </div>
  );
};

export default HowlerPlayer;
