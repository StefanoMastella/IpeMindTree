import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Schema for login form validation
const loginSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot be more than 50 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
});

// Schema for registration form validation
const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot be more than 50 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters"),
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // If user is already authenticated, redirect to home page
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero Section */}
        <div className="order-2 lg:order-1 flex flex-col justify-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-500">
              Ipê Mind Tree
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Transform ideas into a network of interconnected knowledge. Join our community of creative minds!
            </p>
            <div className="space-y-4 text-lg text-muted-foreground">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🌱</span>
                </div>
                <div>
                  <h3 className="font-medium">Plant your ideas</h3>
                  <p>Share knowledge with the community</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="font-medium">Connect concepts</h3>
                  <p>Discover relationships between ideas with AI help</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🌳</span>
                </div>
                <div>
                  <h3 className="font-medium">Cultivate the knowledge tree</h3>
                  <p>Watch collective knowledge grow organically</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="order-1 lg:order-2 flex flex-col justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const auth = useAuth();
  // Use a default fallback for loginMutation if it's not available
  const loginMutation = auth.loginMutation || {
    mutate: async (data: any) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Login failed');
        const user = await res.json();
        window.location.reload();
        return user;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    isPending: false
  };
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Sign in to access all features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password" 
                      autoComplete="current-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <span className="mr-2">Signing in...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : "Sign in"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const auth = useAuth();
  // Use a default fallback for registerMutation if it's not available
  const registerMutation = auth.registerMutation || {
    mutate: async (data: any) => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Registration failed');
        const user = await res.json();
        window.location.reload();
        return user;
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    isPending: false
  };
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: ""
    }
  });

  function onSubmit(values: RegisterFormValues) {
    // Omit password confirmation before sending
    const { passwordConfirm, ...registerData } = values;
    registerMutation.mutate(registerData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>
          Create your account to join the Ipê Mind Tree community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Choose a username" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Create a strong password" 
                      autoComplete="new-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter password again" 
                      autoComplete="new-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <span className="mr-2">Creating account...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : "Create Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}