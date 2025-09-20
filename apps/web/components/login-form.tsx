'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { useAuth } from '@/components/AuthProvider'

interface LoginFormProps extends React.ComponentProps<"div"> {
  className?: string
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
        setMessage('Login successful!')
        router.push('/dashboard')
      } else {
        const { error } = await signUp(email, password, {
          full_name: fullName,
          username: username
        })
        if (error) throw error
        setMessage('Registration successful! Check your email for verification.')
      }
    } catch (error: any) {
      setMessage(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (error: any) {
      setMessage(error.message || 'Google login failed')
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div className={cn("flex flex-col gap-6 max-w-md mx-auto", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-600">
            Options Pro
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Login to your trading account' : 'Create your trading account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Login/Signup Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={isLogin ? "default" : "outline"}
              onClick={() => setIsLogin(true)}
              className="flex-1"
              type="button"
            >
              Login
            </Button>
            <Button
              variant={!isLogin ? "default" : "outline"}
              onClick={() => setIsLogin(false)}
              className="flex-1"
              type="button"
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              {/* Sign Up Additional Fields */}
              {!isLogin && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

              {/* Email Field */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={isLogin ? "Enter your password" : "Create a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Error/Success Message */}
              {message && (
                <Alert className={message.includes('successful') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.includes('successful') ? 'text-green-800' : 'text-red-800'}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-4 text-center text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="underline underline-offset-4 hover:text-blue-600"
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}