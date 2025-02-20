import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const participants = [
  { name: "AI Model", type: "AI", avatar: "/ai-avatar.png" },
  { name: "John Doe", type: "Human", avatar: "/human-avatar-1.png" },
  { name: "Jane Smith", type: "Human", avatar: "/human-avatar-2.png" },
  { name: "Mike Johnson", type: "Human", avatar: "/human-avatar-3.png" },
]

export default function ParticipantList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {participants.map((participant, index) => (
            <li key={index} className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback>{participant.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{participant.name}</p>
                <p className="text-sm text-gray-400">{participant.type}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

