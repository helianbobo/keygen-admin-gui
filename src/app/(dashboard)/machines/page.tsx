import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"

export default function MachinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Machines</h1>
        <p className="text-muted-foreground">Track activated devices and their heartbeats.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-green-500" />
            Machine Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Machine management interface is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
