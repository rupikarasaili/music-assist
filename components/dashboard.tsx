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