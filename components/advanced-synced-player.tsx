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
import * as Tone from 'tone';

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
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Happy Bass 1 Scroll score.webm"
        ),
      },
      {
        id: "v2",
        name: "Score Cam",
        file: encodeURI(
          "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Happy Video Bass 1.webm"
        ),
      },
    ],
    subTracks: [
      { id: "1-1", name: "Bass", file: encodeURI( "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Bass 1.mp3") },
      { id: "1-2", name: "Komp", file: encodeURI( "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Komp.mp3") },
      { id: "1-3", name: "Orchestra", file:encodeURI( "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Orkester.mp3") },
      { id: "1-4", name: "Vocals", file: encodeURI( "https://creativearstorage.blob.core.windows.net/videoaudiofiles/Vocals.mp3") },
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
  const [subTrackVolumes, setSubTrackVolumes] = useState<Record<string, number>>({});
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videosReady, setVideosReady] = useState<Record<string, boolean>>({});
  const [isMediaReady, setIsMediaReady] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Record<string, AudioBufferSourceNode>>({});
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const mergerNodeRef = useRef<ChannelMergerNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pauseTimeRef = useRef<number | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);

  useEffect(() => {
    console.log("Initializing audio context and Tone.js");
    audioContextRef.current = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    
    mergerNodeRef.current = audioContextRef.current.createChannelMerger(
      selectedTrack.subTracks.length
    );
    masterGainNodeRef.current = audioContextRef.current.createGain();
    
    // Initialize Tone.js PitchShift
    Tone.setContext(audioContextRef.current);
    pitchShiftRef.current = new Tone.PitchShift().toDestination();
    
    if (mergerNodeRef.current && masterGainNodeRef.current && pitchShiftRef.current) {
      mergerNodeRef.current.connect(masterGainNodeRef.current);
      masterGainNodeRef.current.connect(pitchShiftRef.current.input);
    }

    return () => {
      console.log("Cleaning up audio context and Tone.js");
      audioContextRef.current?.close();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      pitchShiftRef.current?.dispose();
    };
  }, [selectedTrack.subTracks.length]);

  useEffect(() => {
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
        setIsMediaReady(true);
        console.log(`Video ${selectedVideo.id} metadata loaded`);
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
    const loadVideoWithCache = async () => {
      const videoUrlBlob = await loadVideo(selectedVideo.file);

      if (videoUrlBlob) {
        const videoElement = videoRefs.current[selectedVideo.id];
        if (videoElement) {
          videoElement.src = videoUrlBlob;
          videoElement.addEventListener(
            "loadedmetadata",
            () => {
              setVideosReady((prev) => ({ ...prev, [selectedVideo.id]: true }));
              console.log(`Video ${selectedVideo.id} ready`);
            },
            { once: true }
          );
        }
      } else {
        console.error("Failed to load video");
      }
    };

    loadVideoWithCache();
  }, [selectedVideo]);

  const loadAudio = async (file: string) => {
    console.log(`Loading audio file: ${file}`);
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
    console.log(`Audio file loaded: ${file}`);
    return audioBuffer;
  };

  const loadVideo = async (videoUrl: string) => {
    console.log(`Loading video: ${videoUrl}`);
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
        console.log(`Video cached: ${videoUrl}`);
      } catch (error) {
        console.error("Error fetching video:", error);
        return null;
      }
    } else {
      console.log(`Video loaded from cache: ${videoUrl}`);
    }

    if (videoBlob) {
      const videoUrlBlob = URL.createObjectURL(videoBlob);
      return videoUrlBlob;
    }

    return null;
  };

  const playAudio = async () => {
    if (!audioContextRef.current || !mergerNodeRef.current || !masterGainNodeRef.current) return;

    console.log("Playing audio");
    Object.values(sourceNodesRef.current).forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        console.warn("Failed to stop node:", error);
      }
    });
    sourceNodesRef.current = {};
    gainNodesRef.current = {};

    for (const subTrack of selectedTrack.subTracks) {
      const audioBuffer = await loadAudio(subTrack.file);
      const sourceNode = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(gainNode);

      gainNode.connect(mergerNodeRef.current, 0, 0);
      gainNode.connect(mergerNodeRef.current, 0, 1);

      sourceNode.playbackRate.value = playbackRate;
      gainNode.gain.value = subTrackVolumes[subTrack.id] * masterVolume;
      sourceNodesRef.current[subTrack.id] = sourceNode;
      gainNodesRef.current[subTrack.id] = gainNode;
    }

    masterGainNodeRef.current.gain.value = masterVolume;

    const currentTime = audioContextRef.current.currentTime;
    startTimeRef.current = currentTime;
    pauseTimeRef.current = null;

    const startOffset = progress * duration;
    if (isFinite(startOffset)) {
      Object.values(sourceNodesRef.current).forEach((node) =>
        node.start(currentTime, startOffset)
      );
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.currentTime = startOffset;
          video.play();
        }
      });

      setIsPlaying(true);
      console.log(`Playback started at offset: ${startOffset}`);
    } else {
      console.error("Invalid start offset:", startOffset);
    }
  };

  const pauseAudio = () => {
    if (!audioContextRef.current || !isPlaying) return;

    console.log("Pausing audio");
    pauseTimeRef.current = audioContextRef.current.currentTime - (startTimeRef.current || 0);
    Object.values(sourceNodesRef.current).forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        console.warn("Failed to stop node:", error);
      }
    });
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
      }
    });

    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    console.log(`Changing playback speed to: ${newSpeed}`);
    setPlaybackRate(newSpeed);
    Object.values(sourceNodesRef.current).forEach((node) => {
      node.playbackRate.value = newSpeed;
    });
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.playbackRate = newSpeed;
      }
    });

    // Adjust pitch based on playback speed
    if (pitchShiftRef.current) {
      const pitchAdjustment = Math.log2(newSpeed) * 12; // Convert speed ratio to semitones
      pitchShiftRef.current.pitch = pitchAdjustment;
      console.log(`Pitch adjustment: ${pitchAdjustment} semitones`);
    }
  };

  const handleMasterVolumeChange = (newVolume: number) => {
    console.log(`Changing master volume to: ${newVolume}`);
    setMasterVolume(newVolume);
    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.value = newVolume;
    }
  };

  const handleSubTrackVolumeChange = (subTrackId: string, newVolume: number) => {
    console.log(`Changing volume for subtrack ${subTrackId} to: ${newVolume}`);
    setSubTrackVolumes((prev) => ({ ...prev, [subTrackId]: newVolume }));
    if (gainNodesRef.current[subTrackId]) {
      gainNodesRef.current[subTrackId].gain.value = newVolume * masterVolume;
    }
  };

  const switchVideo = async (videoId: string) => {
    console.log(`Switching to video: ${videoId}`);
    const currentVideo = videoRefs.current[selectedVideo.id];
    const newVideo = selectedTrack.videos.find((v) => v.id === videoId);

    if (newVideo && currentVideo) {
      try {
        currentVideo.pause();
        const currentTime = currentVideo.currentTime;
        setSelectedVideo(newVideo);

        const newVideoElement = videoRefs.current[videoId];
        if (newVideoElement) {
          newVideoElement.currentTime = currentTime;
          newVideoElement.addEventListener(
            "loadedmetadata",
            () => {
              newVideoElement.currentTime = currentTime;
              setProgress(currentTime / newVideoElement.duration);
              console.log(`New video ${videoId} duration:`, newVideoElement.duration);
              if (isPlaying) {
                newVideoElement.play();
              }
            },
            { once: true }
          );
        }
      } catch (error) {
        console.error("Error during video switch:", error);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      console.log("Entering fullscreen mode");
    } else {
      document.exitFullscreen();
      console.log("Exiting fullscreen mode");
    }
  };

  const handleProgressChange = (newProgress: number) => {
    console.log(`Changing progress to: ${newProgress}`);
    setProgress(newProgress);
    const video = videoRefs.current[selectedVideo.id];
    if (video) {
      video.currentTime = newProgress * video.duration;
    }
    if (isPlaying) {
      pauseAudio();
      playAudio();
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes =   Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
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
              disabled={!isMediaReady || !videosReady[selectedVideo.id]}
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
                min={0}
                max={1.5}
                step={0.25}
                value={[playbackRate]}
                onValueChange={([value]) => {
                  if (value < 0.25) {
                    handleSpeedChange(0.25);
                  } else {
                    handleSpeedChange(value);
                  }
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

export default AdvancedSyncedPlayer;