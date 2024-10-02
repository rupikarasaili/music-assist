'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PlayIcon, PauseIcon, SkipForwardIcon, Volume2Icon, ExpandIcon } from 'lucide-react'

// Mock data for tracks, sub-tracks, and videos
const tracks = [
  {
    id: '1',
    name: 'Master of Puppets',
    videos: [
      { id: 'v1', name: 'Full Band', file: '/videos/happy_bass1.mp4' },
      // { id: 'v2', name: 'Guitar Close-up', file: '/videos/master-of-puppets-guitar.mp4' },
      // { id: 'v3', name: 'Drum Cam', file: '/videos/master-of-puppets-drums.mp4' },
    ],
    subTracks: [
      { id: '1-1', name: 'Drums', file: '/audio/happy_bass1.wav' },
      // { id: '1-2', name: 'Guitar', file: '/audio/master-of-puppets-guitar.mp3' },
      // { id: '1-3', name: 'Bass', file: '/audio/master-of-puppets-bass.mp3' },
    ],
    bpm: 212,
  },
]

export function FullscreenAudioVideoPlayerComponent() {
  const [selectedTrack, setSelectedTrack] = useState(tracks[0])
  const [selectedVideo, setSelectedVideo] = useState(selectedTrack.videos[0])
  const [selectedSubTracks, setSelectedSubTracks] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMetronomeOn, setIsMetronomeOn] = useState(false)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodesRef = useRef<Record<string, AudioBufferSourceNode>>({})
  const gainNodesRef = useRef<Record<string, GainNode>>({})
  const startTimeRef = useRef<number | null>(null)
  const pauseTimeRef = useRef<number | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const metronomeIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return () => {
      audioContextRef.current?.close()
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current)
      }
    }
  }, [])

  const loadAudio = async (file: string) => {
    try {
      console.log('Fetching audio file:', file);
      const response = await fetch(file);
  
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
  
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
      console.log('Audio file loaded and decoded successfully');
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio:', error);
      return null;
    }
  };
  

  const playAudio = async () => {
    if (!audioContextRef.current) return;
  
    // Resume the AudioContext if it's suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  
    // Stop and clear previous audio nodes
    Object.values(sourceNodesRef.current).forEach((node) => node.stop());
    sourceNodesRef.current = {};
    gainNodesRef.current = {};
  
    // Load and play selected subtracks
    for (const subTrackId of selectedSubTracks) {
      const subTrack = selectedTrack.subTracks.find((st) => st.id === subTrackId);
      if (subTrack) {
        const audioBuffer = await loadAudio(subTrack.file);
        if (audioBuffer) {
          const sourceNode = audioContextRef.current.createBufferSource();
          const gainNode = audioContextRef.current.createGain();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          sourceNode.playbackRate.value = playbackRate;
          gainNode.gain.value = volume;
          sourceNodesRef.current[subTrackId] = sourceNode;
          gainNodesRef.current[subTrackId] = gainNode;
  
          // Start the audio from the paused time or from the beginning
          const startTime = (pauseTimeRef.current ?? 0) / playbackRate;
          sourceNode.start(0, startTime); // Start from the paused position
        } else {
          console.error('Audio buffer could not be loaded');
        }
      }
    }
  
    // Resume video from paused position
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.currentTime = pauseTimeRef.current ?? 0;
        video.play();
      }
    });
  
    setIsPlaying(true);
  };
  

  const pauseAudio = () => {
    if (!audioContextRef.current || !isPlaying) return;

    // Store the current playback time when paused
    const currentTime = audioContextRef.current.currentTime - (startTimeRef.current ?? 0);
    pauseTimeRef.current = currentTime * playbackRate; // Adjust based on playback rate

    // Stop the audio sources
    Object.values(sourceNodesRef.current).forEach((node) => node.stop());

    // Pause the video as well
    Object.values(videoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
      }
    });

    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
    }

    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }

  const handleSpeedChange = (newSpeed: number[]) => {
    const speed = newSpeed[0]
    setPlaybackRate(speed)
    Object.values(sourceNodesRef.current).forEach(node => {
      node.playbackRate.value = speed
    })
    Object.values(videoRefs.current).forEach(video => {
      if (video) {
        video.playbackRate = speed
      }
    })
    if (isMetronomeOn) {
      stopMetronome()
      startMetronome()
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0]
    setVolume(vol)
    Object.values(gainNodesRef.current).forEach(node => {
      node.gain.value = vol
    })
  }

  const handleSubTrackToggle = (subTrackId: string) => {
    setSelectedSubTracks(prev =>
      prev.includes(subTrackId)
        ? prev.filter(id => id !== subTrackId)
        : [...prev, subTrackId]
    )
  }

  const switchVideo = (videoId: string) => {
    const newVideo = selectedTrack.videos.find(v => v.id === videoId)
    if (newVideo) {
      setSelectedVideo(newVideo)
      // Sync the new video with the current playback time
      const currentVideo = videoRefs.current[selectedVideo.id]
      const newVideoElement = videoRefs.current[videoId]
      if (currentVideo && newVideoElement) {
        newVideoElement.currentTime = currentVideo.currentTime
        if (isPlaying) {
          newVideoElement.play()
        }
      }
    }
  }

  const startMetronome = () => {
    if (!audioContextRef.current) return
    const bpm = selectedTrack.bpm
    const interval = (60 / bpm) / playbackRate
    const playClick = () => {
      const clickOscillator = audioContextRef.current!.createOscillator()
      clickOscillator.type = 'sine'
      clickOscillator.frequency.setValueAtTime(1000, audioContextRef.current!.currentTime)
      const clickGain = audioContextRef.current!.createGain()
      clickGain.gain.setValueAtTime(0.5 * volume, audioContextRef.current!.currentTime)
      clickGain.gain.exponentialRampToValueAtTime(0.01 * volume, audioContextRef.current!.currentTime + 0.1)
      clickOscillator.connect(clickGain)
      clickGain.connect(audioContextRef.current!.destination)
      clickOscillator.start()
      clickOscillator.stop(audioContextRef.current!.currentTime + 0.1)
    }
    playClick() // Play first click immediately
    metronomeIntervalRef.current = window.setInterval(playClick, interval * 1000)
  }

  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current)
      metronomeIntervalRef.current = null
    }
  }

  const toggleMetronome = () => {
    if (isMetronomeOn) {
      stopMetronome()
    } else if (isPlaying) {
      startMetronome()
    }
    setIsMetronomeOn(!isMetronomeOn)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
        {selectedTrack.videos.map((video) => (
      <video
        key={video.id}  // Ensure proper keying
        ref={(el) => (videoRefs.current[video.id] = el)}
        src={video.file}
        className={`absolute inset-0 w-full h-full object-cover ${video.id === selectedVideo.id ? 'block' : 'hidden'}`}
        playsInline
        onLoadedData={() => console.log('Video loaded:', video.file)}  // Debug video loading
      />
    ))}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
          <div className="flex items-center space-x-4">
            <Button onClick={togglePlayPause} variant="outline" size="icon">
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </Button>
            <Button onClick={toggleMetronome} variant={isMetronomeOn ? "default" : "outline"} size="icon">
              <SkipForwardIcon className="h-6 w-6" />
            </Button>
            <div className="flex items-center space-x-2 flex-1">
              <Volume2Icon className="h-4 w-4 text-white" />
              <Slider
                className="w-24"
                min={0}
                max={1}
                step={0.01}
                value={[volume]}
                onValueChange={handleVolumeChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">{playbackRate.toFixed(1)}x</span>
              <Slider
                className="w-24"
                min={0.5}
                max={2}
                step={0.1}
                value={[playbackRate]}
                onValueChange={handleSpeedChange}
              />
            </div>
            <Button onClick={toggleFullscreen} variant="outline" size="icon">
              <ExpandIcon className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex space-x-4">
            <Select
              value={selectedTrack.id}
              onValueChange={(value) => setSelectedTrack(tracks.find(t => t.id === value)!)}
            >
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a track" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map(track => (
                  <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex space-x-2">
              {selectedTrack.videos.map((video) => (
                <Button
                  key={video.id}
                  variant={video.id === selectedVideo.id ? "default" : "outline"}
                  onClick={() => switchVideo(video.id)}
                  size="sm"
                >
                  {video.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex space-x-4">
            {selectedTrack.subTracks.map(subTrack => (
              <div key={subTrack.id} className="flex items-center space-x-2">
                <Checkbox
                  id={subTrack.id}
                  checked={selectedSubTracks.includes(subTrack.id)}
                  onCheckedChange={() => handleSubTrackToggle(subTrack.id)}
                />
                <label htmlFor={subTrack.id} className="text-white text-sm">{subTrack.name}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}