import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key } from "lucide-react"

export default function LicensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Licenses</h1>
        <p className="text-muted-foreground">Manage and track software licenses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            License Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            License management interface is coming soon. 
            You will be able to view, search, and validate licenses here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
