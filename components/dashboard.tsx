import { ChevronRight, Play } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

interface Course {
  title: string
  artist: string
  description: string
  image: string
}

const courses: Course[] = [
  {
    title: "Happy Bass Level 1",
    artist: "Pharrel Williams",
    description: "Hjerteknuser features driving rhythms and passionate lyrics, telling a poignant story of love & heartbreak. The dynamic instrumentation and emotive delivery make this track standout in their discography.",
    image: "/happy.jpg?height=80&width=80",
  },
  {
    title: "Mjød Bass Level 1",
    artist: "Kvelertak",
    description: "Kvelertak, known for their energetic fusion of rock and metal, combines Norwegian folklore and hard-hitting riffs in \"Mjød.\" Their unique sound has garnered international acclaim.",
    image: "/honeybee.jpeg?height=80&width=80",
  },
  {
    title: "Eple Bass Level 2",
    artist: "Röyksopp",
    description: "Röyksopp is celebrated for their atmospheric electronic music, and \"Eple\" showcases their ability to blend catchy melodies with ambient soundscapes.",
    image: "/mazzy.jpeg?height=80&width=80",
  },
  {
    title: "Little Talks Bass Level 1",
    artist: "Of Monsters and Men",
    description: "This indie folk band gained international fame with \"Little Talks,\" a lively anthem that combines male and female vocals. Their music often features rich instrumentation and harmonies.",
    image: "/honeybee.jpeg?height=80&width=80",
  },
  {
    title: "Eple Bass Level 2",
    artist: "Röyksopp",
    description: "Röyksopp is celebrated for their atmospheric electronic music, and \"Eple\" showcases their ability to blend catchy melodies with ambient soundscapes.",
    image: "/mazzy.jpeg?height=80&width=80",
  },
]

interface AssignedCoursesProps {
  onGoToPlayer: (selectedFile?: string) => void
}

export default function Component({ onGoToPlayer }: AssignedCoursesProps) {
  const handleCourseSelect = (courseTitle: string) => {
    onGoToPlayer(courseTitle)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto relative ">
        <div className="flex justify-between items-center mt-12 mb-12 ">
          <div>
            <h1 className="text-4xl font-bold">Assigned Courses</h1>
            <p className="text-gray-400">Welcome to your personalized music journey.</p>
          </div>
          <Button 
            variant="outline" 
            className="bg-orange-500 hover:bg-orange-600 text-white border-none" 
            onClick={() => onGoToPlayer()}
          >
            <Play className="w-4 h-4 mr-2" />
            Go to Player
          </Button>
        </div>

        <div className="space-y-6 ">
          {courses.map((course, index) => (
            <div 
              key={index} 
              className="flex items-start space-x-4 bg-gray-800 bg-opacity-50 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200"
              onClick={() => handleCourseSelect(course.title)}
            >
              <Image
                src={course.image}
                alt={course.title}
                width={80}
                height={80}
                className="rounded-md"
              />
              <div className="flex-grow">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                <p className="text-orange-400">{course.artist}</p>
                <p className="text-sm text-gray-400 mt-1">{course.description}</p>
              </div>
              <ChevronRight className="text-gray-400 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}