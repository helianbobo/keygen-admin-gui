'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Key, Mail, Lock } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const loginSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  adminToken: z.string().min(1, 'Admin Token is required'),
  baseUrl: z.string().url('Must be a valid URL').optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

const credentialSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
  baseUrl: z.string().url('Must be a valid URL').optional(),
})

type CredentialFormValues = z.infer<typeof credentialSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [tabValue, setTabValue] = useState('token')
  const { login } = useAuth()

  // Token form
  const tokenForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      accountId: '',
      adminToken: '',
      baseUrl: 'https://api.keygen.sh/v1',
    },
  })

  // Credential form
  const credentialForm = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      accountId: '',
      email: '',
      password: '',
      baseUrl: 'https://api.keygen.sh/v1',
    },
  })

  async function onTokenSubmit(values: LoginFormValues) {
    setIsLoading(true)
    try {
      // Clean base URL (remove trailing slash)
      const cleanBaseUrl = values.baseUrl?.replace(/\/$/, '') || 'https://api.keygen.sh/v1'
      
      // Validate against Keygen API
      const response = await fetch(`${cleanBaseUrl}/accounts/${values.accountId}/tokens`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${values.adminToken}`,
          'Accept': 'application/vnd.api+json',
        },
      })

      if (response.ok) {
        toast.success('Successfully authenticated')
        login(values.accountId, values.adminToken, cleanBaseUrl)
      } else {
        const error = await response.json().catch(() => ({}))
        const firstError = error.errors?.[0]
        const message = firstError?.detail || firstError?.title || 'Invalid Account ID or Admin Token'
        toast.error(message)
      }
    } catch (err) {
      toast.error('Failed to connect to Keygen API')
    } finally {
      setIsLoading(false)
    }
  }

  async function onCredentialSubmit(values: CredentialFormValues) {
    setIsLoading(true)
    try {
      // Clean base URL (remove trailing slash)
      const cleanBaseUrl = values.baseUrl?.replace(/\/$/, '') || 'https://api.keygen.sh/v1'
      
      // Create Basic Auth header: base64(email:password)
      const authString = `${values.email}:${values.password}`
      const authHeader = `Basic ${btoa(authString)}`
      
      // POST to generate a token
      const response = await fetch(`${cleanBaseUrl}/accounts/${values.accountId}/tokens`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.api+json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const token = data.data?.attributes?.token || data.attributes?.token
        
        if (token) {
          toast.success('Successfully authenticated')
          login(values.accountId, token, cleanBaseUrl)
        } else {
          toast.error('Failed to retrieve token from response')
        }
      } else {
        const error = await response.json().catch(() => ({}))
        const firstError = error.errors?.[0]
        const message = firstError?.detail || firstError?.title || 'Invalid credentials'
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
            Choose your login method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="token">Token Login</TabsTrigger>
              <TabsTrigger value="credential">Credential Login</TabsTrigger>
            </TabsList>

            {/* Token Login Tab */}
            <TabsContent value="token" className="mt-4">
              <Form {...tokenForm}>
                <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-4">
                  <FormField
                    control={tokenForm.control}
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
                    control={tokenForm.control}
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
                  <FormField
                    control={tokenForm.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Base URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.keygen.sh/v1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Authenticating...' : 'Login with Token'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Credential Login Tab */}
            <TabsContent value="credential" className="mt-4">
              <Form {...credentialForm}>
                <form onSubmit={credentialForm.handleSubmit(onCredentialSubmit)} className="space-y-4">
                  <FormField
                    control={credentialForm.control}
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
                    control={credentialForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={credentialForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={credentialForm.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Base URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.keygen.sh/v1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Authenticating...' : 'Login with Credentials'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
