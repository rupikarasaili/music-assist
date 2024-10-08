import { useState } from 'react'
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FolderItem {
  name: string
  type: 'folder' | 'file'
  children?: FolderItem[]
}

const libraryStructure: FolderItem[] = [
  {
    name: 'Music',
    type: 'folder',
    children: [
      { 
        name: 'Pop', 
        type: 'folder', 
        children: [
          { name: 'Happy - Pharrel Williams', type: 'file' },
          { name: 'Bebop', type: 'file' },
        ]
      },
      { name: 'Rock', type: 'folder', children: [] },
    ],
  },
]

interface FolderStructureProps {
  items: FolderItem[]
  onFileSelect: (fileName: string) => void
}

const FolderStructure: React.FC<FolderStructureProps> = ({ items, onFileSelect }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.name}>
          {item.type === 'folder' ? (
            <div>
              <button
                onClick={() => toggleFolder(item.name)}
                className="flex items-center space-x-2 text-sm font-medium"
              >
                {expandedFolders[item.name] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Folder className="h-4 w-4" />
                <span>{item.name}</span>
              </button>
              {expandedFolders[item.name] && item.children && (
                <div className="ml-6 mt-2">
                  <FolderStructure items={item.children} onFileSelect={onFileSelect} />
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onFileSelect(item.name)}
              className="flex items-center space-x-2 text-sm ml-6 hover:bg-accent hover:text-accent-foreground p-1 rounded-md w-full text-left"
            >
              <File className="h-4 w-4" />
              <span>{item.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

interface DashboardProps {
  onGoToPlayer: (selectedFile?: string) => void
}

export default function Dashboard({ onGoToPlayer }: DashboardProps) {
  const handleFileSelect = (fileName: string) => {
    onGoToPlayer(fileName)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Library Dashboard</h1>
        <Button onClick={() => onGoToPlayer()}>Go to Player</Button>
      </div>
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Library</h2>
        <FolderStructure items={libraryStructure} onFileSelect={handleFileSelect} />
      </div>
    </div>
  )
}

{/* <div
ref={containerRef}
className='relative w-full h-screen bg-black overflow-hidden'
>
{selectedTrack.videos.map((video) => (
  <video
    key={video.id}
    ref={(el) => {
      videoRefs.current[video.id] = el;
    }}
    src={video.file}
    className={`absolute inset-0 w-full h-full object-cover ${
      video.id === selectedVideo.id ? 'block' : 'hidden'
    }`}
    playsInline
  />
))}

<div
  className={`absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
    showControls ? 'opacity-100' : 'opacity-0'
  }`}
  onMouseEnter={() => setShowControls(true)}
  onMouseLeave={() => setShowControls(false)}
>
  <div className='absolute bottom-0 left-0 right-0 p-4 space-y-4'>
    <div className='flex items-center space-x-2'>
      <span className='text-white text-sm'>
        {formatTime(progress * duration)}
      </span>
      <Slider
        className='flex-1'
        min={0}
        max={1}
        step={0.001}
        value={[progress]}
        onValueChange={([value]) => handleProgressChange(value)}
      />
      <span className='text-white text-sm'>{formatTime(duration)}</span>
    </div>

    <div className='flex items-center space-x-4'>
      <Button onClick={togglePlayPause} variant='outline' size='icon'>
        {isPlaying ? (
          <PauseIcon className='h-6 w-6' />
        ) : (
          <PlayIcon className='h-6 w-6' />
        )}
      </Button>
      <div className='flex items-center space-x-2 flex-1'>
        <Volume2Icon className='h-4 w-4 text-white' />
        <Slider
          className='w-24'
          min={0}
          max={1}
          step={0.01}
          value={[masterVolume]}
          onValueChange={([value]) => handleMasterVolumeChange(value)}
        />
      </div>
      <Snail className='size-4 text-white' />
      <div className='flex gap-x-2'>
        <Slider
          className='w-48'
          min={0}
          max={1}
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
        <span className='w-10 text-sm text-white text-center'>
          {playbackRate.toFixed(2) + 'x'}
        </span>
      </div>
      <Button onClick={toggleFullscreen} variant='outline' size='icon'>
        <ExpandIcon className='h-6 w-6' />
      </Button>
    </div>

    <div className='flex space-x-4'>
      <Select
        value={selectedTrack.id}
        onValueChange={(value) =>
          setSelectedTrack(tracks.find((t) => t.id === value)!)
        }
      >
        <SelectTrigger className='w-[180px] bg-white/10 border-white/20 text-white'>
          <SelectValue placeholder='Select a track' />
        </SelectTrigger>
        <SelectContent>
          {tracks.map((track) => (
            <SelectItem key={track.id} value={track.id}>
              {track.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className='flex space-x-2'>
        {selectedTrack.videos.map((video) => (
          <Button
            key={video.id}
            variant={
              video.id === selectedVideo.id ? 'default' : 'outline'
            }
            onClick={() => switchVideo(video.id)}
            size='sm'
          >
            {video.name}
          </Button>
        ))}
      </div>
    </div>

    <div className='flex space-x-4 bg-black/50 p-4 rounded-lg'>
      {selectedTrack.subTracks.map((subTrack) => (
        <div
          key={subTrack.id}
          className='flex flex-col items-center space-y-2'
        >
          <label htmlFor={subTrack.id} className='text-white text-sm'>
            {subTrack.name}
          </label>
          <Slider
            id={subTrack.id}
            className='w-24'
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
</div> */}