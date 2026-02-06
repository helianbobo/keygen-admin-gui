'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Key } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const loginSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  adminToken: z.string().min(1, 'Admin Token is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      accountId: '',
      adminToken: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true)
    try {
      // Validate against Keygen API
      // We'll try to fetch tokens as a simple validation step
      const response = await fetch(`https://api.keygen.sh/v1/accounts/${values.accountId}/tokens`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${values.adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })

      if (response.ok) {
        toast.success('Successfully authenticated')
        login(values.accountId, values.adminToken)
      } else {
        const error = await response.json().catch(() => ({}))
        const message = error.errors?.[0]?.detail || 'Invalid Account ID or Admin Token'
        toast.error(message)
      }
    } catch (err) {
      toast.error('Failed to connect to Keygen API')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Key className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Keygen Admin</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="your-account-id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adminToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="prod-..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
