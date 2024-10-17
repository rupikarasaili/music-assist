"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
import {
  saveMediaToIndexedDB,
  getMediaFromIndexedDB,
} from "../indexedDBUtils";

// Mock data for tracks, sub-tracks, and videos
const tracks = [
  {
    id: "1",
    name: "Happy - Pharrell Williams",
    videos: [
      {
        id: "v1",
        name: "Score Cam",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Happy Bass 1 Scroll score.webm"
        ),
      },
      {
        id: "v2",
        name: "Bass Cam",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Happy Video Bass 1.webm"
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

interface AdvancedSyncedPlayerProps {
  selectedFile?: string;
  onBackToDashboard: () => void;
}

const AdvancedSyncedPlayer: React.FC<AdvancedSyncedPlayerProps> = ({
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
  const [videosReady, setVideosReady] = useState<Record<string, boolean>>({});
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [allMediaLoaded, setAllMediaLoaded] = useState(false);
  const [savedCurrentTime, setSavedCurrentTime] = useState(0);
  const [shouldResumePlayback, setShouldResumePlayback] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Initialize subTrackVolumes when selectedTrack changes
  useMemo(() => {
    const initialVolumes: Record<string, number> = {};
    selectedTrack.subTracks.forEach((subTrack) => {
      initialVolumes[subTrack.id] = 1;
    });
    setSubTrackVolumes(initialVolumes);
  }, [selectedTrack]);
  

  useEffect(() => {
    const video = videoRefs.current[selectedVideo.id];
    if (video) {
      const updateDuration = () => {
        setDuration(video.duration || 0);
        console.log(`Duration of video ${selectedVideo.id}:`, video.duration);
      };

      const updateProgress = () => {
        setProgress(video.currentTime / (video.duration || 1));
      };

      const handleLoadedMetadata = () => {
        updateDuration();
        setIsMediaReady(true); // Set media as ready when metadata is loaded
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", updateProgress);

      // Initialize progress and duration
      setProgress(0);
      setDuration(video.duration || 0);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", updateProgress);
      };
    }
  }, [selectedVideo]);

  useEffect(() => {
    // Ensure subTrackVolumes is initialized before running loadMedia
    if (Object.keys(subTrackVolumes).length === 0) return;
  
    const loadMedia = async () => {
      try {
        const audioPromises = selectedTrack.subTracks.map(async (subTrack) => {
          try {
            const audioElement = new Audio();
            audioElement.crossOrigin = "anonymous";
            audioElement.preload = "auto";
            audioElement.loop = false;
  
            audioElementsRef.current[subTrack.id] = audioElement;
  
            // Use loadAudio with progress tracking
            const audioBlobUrl = await loadAudio(subTrack.file, subTrack.name);
            if (audioBlobUrl) {
              audioElement.src = audioBlobUrl;
            } else {
              console.error(`Failed to load audio for ${subTrack.name}`);
            }
  
            return new Promise<void>((resolve) => {
              audioElement.addEventListener("canplaythrough", () => {
                resolve();
              });
              audioElement.addEventListener("error", () => {
                console.error(`Error in audio element for ${subTrack.name}`);
                resolve(); // Resolve to prevent hanging
              });
            });
          } catch (error) {
            console.error(`Error loading audio ${subTrack.name}:`, error);
            return Promise.resolve(); // Resolve to prevent Promise.all from hanging
          }
        });
  
        const videoPromises = selectedTrack.videos.map(async (video) => {
          try {
            const videoUrlBlob = await loadVideo(video.file, video.name);
            if (videoUrlBlob) {
              const videoElement = videoRefs.current[video.id];
              if (videoElement) {
                videoElement.src = videoUrlBlob;
                return new Promise<void>((resolve) => {
                  videoElement.addEventListener(
                    "loadedmetadata",
                    () => {
                      setVideosReady((prev) => ({ ...prev, [video.id]: true }));
                      resolve();
                    },
                    { once: true }
                  );
                  videoElement.addEventListener("error", () => {
                    console.error(`Error in video element for ${video.name}`);
                    resolve(); // Resolve to prevent hanging
                  });
                });
              } else {
                console.error(`Video element not found for id: ${video.id}`);
                return Promise.resolve();
              }
            } else {
              console.error(`Failed to load video for ${video.name}`);
              return Promise.resolve();
            }
          } catch (error) {
            console.error(`Error loading video ${video.name}:`, error);
            return Promise.resolve();
          }
        });
  
        await Promise.all([...audioPromises, ...videoPromises]);
        setAllMediaLoaded(true);
      } catch (error) {
        console.error("Error loading media:", error);
      } finally {
        setIsBuffering(false);
      }
    };
  
    loadMedia();
  }, [selectedTrack]);
  useEffect(() => {
    const newVideoElement = videoRefs.current[selectedVideo.id];
    if (newVideoElement) {
      const playNewVideo = () => {
        newVideoElement.currentTime = savedCurrentTime;
        newVideoElement.playbackRate = playbackRate;
  
        if (shouldResumePlayback) {
          newVideoElement.play();
        }
      };
  
      if (newVideoElement.readyState >= 1) {
        // Metadata is already loaded
        playNewVideo();
      } else {
        newVideoElement.addEventListener("loadedmetadata", playNewVideo, {
          once: true,
        });
      }
    }
  }, [selectedVideo, savedCurrentTime, shouldResumePlayback, playbackRate]);
  

  // Function to fetch media with progress tracking
  const fetchWithProgress = async (
    url: string,
    mediaName: string,
    mediaType: "audio" | "video"
  ): Promise<Response> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${mediaType}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("Content-Length");
    if (!contentLength) {
      console.warn(`Content-Length not available for ${mediaName}`);
      return response;
    }

    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body!.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
        loaded += value.length;
        const percent = ((loaded / total) * 100).toFixed(2);
        console.log(`Downloading ${mediaType} "${mediaName}": ${percent}%`);
      }
    }

    const blob = new Blob(chunks);
    return new Response(blob, {
      headers: response.headers,
    });
  };

  const loadVideo = async (videoUrl: string, videoName: string) => {
    let videoBlob = await getMediaFromIndexedDB(videoUrl);

    if (!videoBlob) {
      try {
        const response = await fetchWithProgress(videoUrl, videoName, "video");
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

  const loadAudio = async (audioUrl: string, audioName: string) => {
    let audioBlob = await getMediaFromIndexedDB(audioUrl);

    if (!audioBlob) {
      try {
        const response = await fetchWithProgress(audioUrl, audioName, "audio");
        const blob = await response.blob();
        await saveMediaToIndexedDB(audioUrl, blob);
        audioBlob = blob;
      } catch (error) {
        console.error("Error fetching audio:", error);
        return null;
      }
    }

    if (audioBlob) {
      const audioBlobUrl = URL.createObjectURL(audioBlob);
      return audioBlobUrl;
    }

    return null;
  };

  const playAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } else if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    // Connect audio elements if not already connected
    for (const subTrack of selectedTrack.subTracks) {
      const audioElement = audioElementsRef.current[subTrack.id];
      if (audioElement) {
        // Only create media source node and gain node if they don't already exist
        if (!gainNodesRef.current[subTrack.id]) {
          const mediaSourceNode =
            audioContextRef.current.createMediaElementSource(audioElement);

          const gainNode = audioContextRef.current.createGain();
          const volume = subTrackVolumes[subTrack.id] ?? 1;
          gainNode.gain.value = volume * masterVolume;

          mediaSourceNode.connect(gainNode).connect(
            audioContextRef.current.destination
          );

          gainNodesRef.current[subTrack.id] = gainNode;
        } else {
          // Update gain value in case it has changed
          gainNodesRef.current[subTrack.id].gain.value =
            (subTrackVolumes[subTrack.id] ?? 1) * masterVolume;
        }
      }
    }

    for (const subTrack of selectedTrack.subTracks) {
      const audioElement = audioElementsRef.current[subTrack.id];
      if (audioElement) {
        audioElement.playbackRate = playbackRate;
        // @ts-ignore
        audioElement.preservesPitch = true;
        // For browser compatibility
        // @ts-ignore
        audioElement.webkitPreservesPitch = true;
        // @ts-ignore
        audioElement.mozPreservesPitch = true;
        audioElement.volume = subTrackVolumes[subTrack.id] * masterVolume;
        audioElement.currentTime = progress * duration;
        audioElement.play();
      }
    }

    const videoElement = videoRefs.current[selectedVideo.id];
    if (videoElement) {
      videoElement.playbackRate = playbackRate;
      videoElement.currentTime = progress * duration;
      videoElement.play();
    }

    setIsPlaying(true);
  };

  const pauseAudio = () => {
    for (const subTrack of selectedTrack.subTracks) {
      const audioElement = audioElementsRef.current[subTrack.id];
      if (audioElement) {
        audioElement.pause();
      }
    }

    const videoElement = videoRefs.current[selectedVideo.id];
    if (videoElement) {
      videoElement.pause();
    }

    if (audioContextRef.current && audioContextRef.current.state === "running") {
      audioContextRef.current.suspend();
    }

    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      // Pause audio
      pauseAudio();
    } else {
      // Play audio
      playAudio();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackRate(newSpeed);
    for (const subTrack of selectedTrack.subTracks) {
      const audioElement = audioElementsRef.current[subTrack.id];
      if (audioElement) {
        audioElement.playbackRate = newSpeed;
      }
    }
    const videoElement = videoRefs.current[selectedVideo.id];
    if (videoElement) {
      videoElement.playbackRate = newSpeed;
    }
  };

  const handleMasterVolumeChange = (newVolume: number) => {
    setMasterVolume(newVolume);
    for (const subTrack of selectedTrack.subTracks) {
      const gainNode = gainNodesRef.current[subTrack.id];
      if (gainNode) {
        gainNode.gain.value = (subTrackVolumes[subTrack.id] ?? 1) * newVolume;
      }
    }
  };

  const handleSubTrackVolumeChange = (
    subTrackId: string,
    newVolume: number
  ) => {
    setSubTrackVolumes((prev) => ({ ...prev, [subTrackId]: newVolume }));
    const gainNode = gainNodesRef.current[subTrackId];
    if (gainNode) {
      gainNode.gain.value = newVolume * masterVolume;
    }
  };

  const switchVideo = (videoId: string) => {
    const currentVideo = videoRefs.current[selectedVideo.id];
    const newVideo = selectedTrack.videos.find((v) => v.id === videoId);
  
    if (newVideo && currentVideo) {
      try {
        const currentTime = currentVideo.currentTime;
        const isCurrentlyPlaying = isPlaying;
  
        currentVideo.pause();
        setSavedCurrentTime(currentTime);
        setShouldResumePlayback(isCurrentlyPlaying);
        setSelectedVideo(newVideo);
      } catch (error) {
        console.error("Error during video switch:", error);
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
    const video = videoRefs.current[selectedVideo.id];
    if (video) {
      video.currentTime = newProgress * video.duration;
    }
    for (const subTrack of selectedTrack.subTracks) {
      const audioElement = audioElementsRef.current[subTrack.id];
      if (audioElement) {
        audioElement.currentTime = newProgress * duration;
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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
              disabled={
                !isMediaReady ||
                !videosReady[selectedVideo.id] ||
                !allMediaLoaded
              } // Disable until all media is loaded
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
                onValueChange={([value]) => {
                  handleSpeedChange(value);
                }}
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
                  value={[subTrackVolumes[subTrack.id] ?? 1]}
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

export default AdvancedSyncedPlayer;
