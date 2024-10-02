// 'use client'

// import React, { useState, useRef, useEffect } from 'react'
// import { Button } from "@/components/ui/button"
// import { Slider } from "@/components/ui/slider"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Checkbox } from "@/components/ui/checkbox"
// import { PlayIcon, PauseIcon, SkipForwardIcon, Volume2Icon, ExpandIcon } from 'lucide-react'

// // Mock data for tracks, sub-tracks, and videos
// const tracks = [
//   {
//     id: '1',
//     name: 'Master of Puppets',
//     videos: [
//       { id: 'v1', name: 'Full Band', file: '/videos/master-of-puppets-full.mp4' },
//       { id: 'v2', name: 'Guitar Close-up', file: '/videos/master-of-puppets-guitar.mp4' },
//     ],
//     subTracks: [
//       { id: '1-1', name: 'Drums', file: '/audio/master-of-puppets-drums.mp3' },
//       { id: '1-2', name: 'Guitar', file: '/audio/master-of-puppets-guitar.mp3' },
//       { id: '1-3', name: 'Bass', file: '/audio/master-of-puppets-bass.mp3' },
//     ],
//     bpm: 212,
//   },
//   // Add more tracks as needed
// ]

// export default function AdvancedSyncedPlayer() {
//   const [selectedTrack, setSelectedTrack] = useState(tracks[0])
//   const [selectedVideo, setSelectedVideo] = useState(selectedTrack.videos[0])
//   const [selectedSubTracks, setSelectedSubTracks] = useState<string[]>([])
//   const [isPlaying, setIsPlaying] = useState(false)
//   const [playbackRate, setPlaybackRate] = useState(1)
//   const [isMetronomeOn, setIsMetronomeOn] = useState(false)
//   const [masterVolume, setMasterVolume] = useState(1)
//   const [subTrackVolumes, setSubTrackVolumes] = useState<Record<string, number>>({})
//   const [showControls, setShowControls] = useState(true)
//   const [progress, setProgress] = useState(0)
//   const [duration, setDuration] = useState(0)

//   const audioContextRef = useRef<AudioContext | null>(null)
//   const sourceNodesRef = useRef<Record<string, AudioBufferSourceNode>>({})
//   const gainNodesRef = useRef<Record<string, GainNode>>({})
//   const mergerNodeRef = useRef<ChannelMergerNode | null>(null)
//   const masterGainNodeRef = useRef<GainNode | null>(null)
//   const startTimeRef = useRef<number | null>(null)
//   const pauseTimeRef = useRef<number | null>(null)
//   const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
//   const metronomeIntervalRef = useRef<number | null>(null)
//   const containerRef = useRef<HTMLDivElement>(null)
//   const progressIntervalRef = useRef<number | null>(null)

//   useEffect(() => {
//     audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
//     mergerNodeRef.current = audioContextRef.current.createChannelMerger(selectedTrack.subTracks.length)
//     masterGainNodeRef.current = audioContextRef.current.createGain()
//     mergerNodeRef.current.connect(masterGainNodeRef.current)
//     masterGainNodeRef.current.connect(audioContextRef.current.destination)

//     return () => {
//       audioContextRef.current?.close()
//       if (metronomeIntervalRef.current) {
//         clearInterval(metronomeIntervalRef.current)
//       }
//       if (progressIntervalRef.current) {
//         clearInterval(progressIntervalRef.current)
//       }
//     }
//   }, [])

//   useEffect(() => {
//     const initialVolumes: Record<string, number> = {}
//     selectedTrack.subTracks.forEach(subTrack => {
//       initialVolumes[subTrack.id] = 1
//     })
//     setSubTrackVolumes(initialVolumes)
//   }, [selectedTrack])

//   useEffect(() => {
//     const video = videoRefs.current[selectedVideo.id]
//     if (video) {
//       const updateDuration = () => setDuration(video.duration)
//       video.addEventListener('loadedmetadata', updateDuration)
//       return () => video.removeEventListener('loadedmetadata', updateDuration)
//     }
//   }, [selectedVideo])

//   const loadAudio = async (file: string) => {
//     const response = await fetch(file)
//     const arrayBuffer = await response.arrayBuffer()
//     const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
//     return audioBuffer
//   }

//   const playAudio = async () => {
//     if (!audioContextRef.current || !mergerNodeRef.current || !masterGainNodeRef.current) return

//     // Stop and remove existing source nodes
//     Object.values(sourceNodesRef.current).forEach(node => node.stop())
//     sourceNodesRef.current = {}
//     gainNodesRef.current = {}

//     for (const subTrack of selectedTrack.subTracks) {
//       const audioBuffer = await loadAudio(subTrack.file)
//       const sourceNode = audioContextRef.current.createBufferSource()
//       const gainNode = audioContextRef.current.createGain()
//       sourceNode.buffer = audioBuffer
//       sourceNode.connect(gainNode)
//       gainNode.connect(mergerNodeRef.current)
//       sourceNode.playbackRate.value = playbackRate
//       gainNode.gain.value = subTrackVolumes[subTrack.id] * masterVolume
//       sourceNodesRef.current[subTrack.id] = sourceNode
//       gainNodesRef.current[subTrack.id] = gainNode
//     }

//     masterGainNodeRef.current.gain.value = masterVolume

//     const currentTime = audioContextRef.current.currentTime
//     startTimeRef.current = currentTime
//     pauseTimeRef.current = null

//     const startOffset = progress * duration
//     Object.values(sourceNodesRef.current).forEach(node => node.start(currentTime, startOffset))
//     Object.values(videoRefs.current).forEach(video => {
//       if (video) {
//         video.currentTime = startOffset
//         video.play()
//       }
//     })

//     if (isMetronomeOn) {
//       startMetronome()
//     }

//     startProgressInterval()
//     setIsPlaying(true)
//   }

//   const pauseAudio = () => {
//     if (!audioContextRef.current || !isPlaying) return

//     pauseTimeRef.current = audioContextRef.current.currentTime - (startTimeRef.current || 0)
//     Object.values(sourceNodesRef.current).forEach(node => node.stop())
//     Object.values(videoRefs.current).forEach(video => {
//       if (video) {
//         video.pause()
//       }
//     })

//     if (metronomeIntervalRef.current) {
//       clearInterval(metronomeIntervalRef.current)
//     }

//     stopProgressInterval()
//     setIsPlaying(false)
//   }

//   const togglePlayPause = () => {
//     if (isPlaying) {
//       pauseAudio()
//     } else {
//       playAudio()
//     }
//   }

//   const handleSpeedChange = (newSpeed: number) => {
//     setPlaybackRate(newSpeed)
//     Object.values(sourceNodesRef.current).forEach(node => {
//       node.playbackRate.value = newSpeed
//     })
//     Object.values(videoRefs.current).forEach(video => {
//       if (video) {
//         video.playbackRate = newSpeed
//       }
//     })
//     if (isMetronomeOn) {
//       stopMetronome()
//       startMetronome()
//     }
//   }

//   const handleMasterVolumeChange = (newVolume: number) => {
//     setMasterVolume(newVolume)
//     if (masterGainNodeRef.current) {
//       masterGainNodeRef.current.gain.value = newVolume
//     }
//   }

//   const handleSubTrackVolumeChange = (subTrackId: string, newVolume: number) => {
//     setSubTrackVolumes(prev => ({ ...prev, [subTrackId]: newVolume }))
//     if (gainNodesRef.current[subTrackId]) {
//       gainNodesRef.current[subTrackId].gain.value = newVolume * masterVolume
//     }
//   }

//   const handleSubTrackToggle = (subTrackId: string) => {
//     setSelectedSubTracks(prev =>
//       prev.includes(subTrackId)
//         ? prev.filter(id => id !== subTrackId)
//         : [...prev, subTrackId]
//     )
//     if (gainNodesRef.current[subTrackId]) {
//       gainNodesRef.current[subTrackId].gain.value = selectedSubTracks.includes(subTrackId) ? 0 : subTrackVolumes[subTrackId] * masterVolume
//     }
//   }

//   const switchVideo = (videoId: string) => {
//     const newVideo = selectedTrack.videos.find(v => v.id === videoId)
//     if (newVideo) {
//       setSelectedVideo(newVideo)
//       // Sync the new video with the current playback time
//       const currentVideo = videoRefs.current[selectedVideo.id]
//       const newVideoElement = videoRefs.current[videoId]
//       if (currentVideo && newVideoElement) {
//         newVideoElement.currentTime = currentVideo.currentTime
//         if (isPlaying) {
//           newVideoElement.play()
//         }
//       }
//     }
//   }

//   const startMetronome = () => {
//     if (!audioContextRef.current) return

//     const bpm = selectedTrack.bpm
//     const interval = (60 / bpm) / playbackRate

//     const playClick = () => {
//       const clickOscillator = audioContextRef.current!.createOscillator()
//       clickOscillator.type = 'sine'
//       clickOscillator.frequency.setValueAtTime(1000, audioContextRef.current!.currentTime)
      
//       const clickGain = audioContextRef.current!.createGain()
//       clickGain.gain.setValueAtTime(0.5 * masterVolume, audioContextRef.current!.currentTime)
//       clickGain.gain.exponentialRampToValueAtTime(0.01 * masterVolume, audioContextRef.current!.currentTime + 0.1)
      
//       clickOscillator.connect(clickGain)
//       clickGain.connect(audioContextRef.current!.destination)
      
//       clickOscillator.start()
//       clickOscillator.stop(audioContextRef.current!.currentTime + 0.1)
//     }

//     playClick() // Play first click immediately
//     metronomeIntervalRef.current = window.setInterval(playClick, interval * 1000)
//   }

//   const stopMetronome = () => {
//     if (metronomeIntervalRef.current) {
//       clearInterval(metronomeIntervalRef.current)
//       metronomeIntervalRef.current = null
//     }
//   }

//   const toggleMetronome = () => {
//     if (isMetronomeOn) {
//       stopMetronome()
//     } else if (isPlaying) {
//       startMetronome()
//     }
//     setIsMetronomeOn(!isMetronomeOn)
//   }

//   const toggleFullscreen = () => {
//     if (!document.fullscreenElement) {
//       containerRef.current?.requestFullscreen()
//     } else {
//       document.exitFullscreen()
//     }
//   }

//   const startProgressInterval = () => {
//     if (progressIntervalRef.current) {
//       clearInterval(progressIntervalRef.current)
//     }
//     progressIntervalRef.current = window.setInterval(() => {
//       const video = videoRefs.current[selectedVideo.id]
//       if (video) {
//         setProgress(video.currentTime / video.duration)
//       }
//     }, 1000 / 30) // Update 30 times per second
//   }

//   const stopProgressInterval = () => {
//     if (progressIntervalRef.current) {
//       clearInterval(progressIntervalRef.current)
//       progressIntervalRef.current = null
//     }
//   }

//   const handleProgressChange = (newProgress: number) => {
//     setProgress(newProgress)
//     const video = videoRefs.current[selectedVideo.id]
//     if (video) {
//       video.currentTime = newProgress * video.duration
//     }
//     if (isPlaying) {
//       pauseAudio()
//       playAudio()
//     }
//   }

//   const formatTime = (timeInSeconds: number) => {
//     const minutes = Math.floor(timeInSeconds / 60)
//     const seconds = Math.floor(timeInSeconds % 60)
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`
//   }

//   return (
//     <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden">
//       {selectedTrack.videos.map((video) => (
//         <video
//           key={video.id}
//           ref={(el) => videoRefs.current[video.id] = el}
//           src={video.file}
//           className={`absolute inset-0 w-full h-full object-cover ${video.id === selectedVideo.id ? 'block' : 'hidden'}`}
//           playsInline
//         />
//       ))}
      
//       <div 
//         className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
//         onMouseEnter={() => setShowControls(true)}
//         onMouseLeave={() => setShowControls(false)}
//       >
//         <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
//           <div className="flex items-center space-x-2">
//             <span className="text-white text-sm">{formatTime(progress * duration)}</span>
//             <Slider
//               className="flex-1"
//               min={0}
//               max={1}
//               step={0.001}
//               value={[progress]}
//               onValueChange={([value]) => handleProgressChange(value)}
//             />
//             <span className="text-white text-sm">{formatTime(duration)}</span>
//           </div>

//           <div className="flex items-center space-x-4">
//             <Button onClick={togglePlayPause} variant="outline" size="icon">
//               {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
//             </Button>
//             <Button onClick={toggleMetronome} variant={isMetronomeOn ? "default" : "outline"} size="icon">
//               <SkipForwardIcon className="h-6 w-6" />
//             </Button>
//             <div className="flex items-center space-x-2 flex-1">
//               <Volume2Icon className="h-4 w-4 text-white" />
//               <Slider
//                 className="w-24"
//                 min={0}
//                 max={1}
//                 step={0.01}
//                 value={[masterVolume]}
//                 onValueChange={([value]) => handleMasterVolumeChange(value)}
//               />
//             </div>
//             <div className="flex items-center space-x-2">
//               <span className="text-white text-sm">{playbackRate.toFixed(1)}x</span>
//               <Slider
//                 className="w-24"
//                 min={0.5}
//                 max={2}
//                 step={0.1}
//                 value={[playbackRate]}
//                 onValueChange={([value]) => handleSpeedChange(value)}
//               />
//             </div>
//             <Button onClick={toggleFullscreen} variant="outline" size="icon">
//               <ExpandIcon className="h-6 w-6" />
//             </Button>
//           </div>
          
//           <div className="flex space-x-4">
//             <Select
//               value={selectedTrack.id}
//               onValueChange={(value) => setSelectedTrack(tracks.find(t => t.id === value)!)}
//             >
//               <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
//                 <SelectValue placeholder="Select a track" />
//               </SelectTrigger>
//               <SelectContent>
//                 {tracks.map(track => (
//                   <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
            
//             <div className="flex space-x-2">
//               {selectedTrack.videos.map((video) => (
//                 <Button
//                   key={video.id}
//                   variant={video.id === selectedVideo.id ? "default" : "outline"}
//                   onClick={() => switchVideo(video.id)}
//                   size="sm"
//                 >
//                   {video.name}
//                 </Button>
//               ))}
//             </div>
//           </div>
          
//           <div className="flex space-x-4">
//             {selectedTrack.subTracks.map(subTrack => (
//               <div key={subTrack.id} className="flex flex-col items-center space-y-2">
//                 <Checkbox
//                   id={subTrack.id}
//                   checked={selectedSubTracks.includes(subTrack.id)}
//                   onCheckedChange={() => handleSubTrackToggle(subTrack.id)}
//                 />
//                 <label htmlFor={subTrack.id} className="text-white text-sm">{subTrack.name}</label>
//                 <Slider
//                   className="h-24"
//                   min={0}
//                   max={1}
//                   step={0.01}
//                   value={[subTrackVolumes[subTrack.id] || 0]}
//                   onValueChange={([value]) => handleSubTrackVolumeChange(subTrack.id, value)}
//                   orientation="vertical"
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }