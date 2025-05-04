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

// Schema para validação do formulário de login
const loginSchema = z.object({
  username: z.string()
    .min(3, "O nome de usuário deve ter pelo menos 3 caracteres")
    .max(50, "O nome de usuário não pode ter mais de 50 caracteres"),
  password: z.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
});

// Schema para validação do formulário de registro
const registerSchema = z.object({
  username: z.string()
    .min(3, "O nome de usuário deve ter pelo menos 3 caracteres")
    .max(50, "O nome de usuário não pode ter mais de 50 caracteres"),
  password: z.string()
    .min(6, "A senha deve ter pelo menos 6 caracteres"),
  passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Se o usuário já estiver autenticado, redirecionar para a página inicial
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seção do Hero */}
        <div className="order-2 lg:order-1 flex flex-col justify-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-500">
              Ipê Mind Tree
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Transforme ideias em uma rede de conhecimento interligado. Faça parte da nossa comunidade de mentes criativas!
            </p>
            <div className="space-y-4 text-lg text-muted-foreground">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🌱</span>
                </div>
                <div>
                  <h3 className="font-medium">Plante suas ideias</h3>
                  <p>Compartilhe conhecimento com a comunidade</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🔗</span>
                </div>
                <div>
                  <h3 className="font-medium">Conecte conceitos</h3>
                  <p>Descubra relações entre ideias com ajuda da IA</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary text-lg">🌳</span>
                </div>
                <div>
                  <h3 className="font-medium">Cultive a árvore do conhecimento</h3>
                  <p>Veja o conhecimento coletivo crescer organicamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de autenticação */}
        <div className="order-1 lg:order-2 flex flex-col justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
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
  const { loginMutation } = useAuth();
  
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
          Entre com sua conta para acessar todas as funcionalidades
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
                  <FormLabel>Nome de usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome de usuário" autoComplete="username" {...field} />
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite sua senha" 
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
                  <span className="mr-2">Entrando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : "Entrar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: ""
    }
  });

  function onSubmit(values: RegisterFormValues) {
    // Omitir a confirmação de senha antes de enviar
    const { passwordConfirm, ...registerData } = values;
    registerMutation.mutate(registerData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro</CardTitle>
        <CardDescription>
          Crie sua conta para participar da comunidade Ipê Mind Tree
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
                  <FormLabel>Nome de usuário</FormLabel>
                  <FormControl>
                    <Input placeholder="Escolha um nome de usuário" autoComplete="username" {...field} />
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Crie uma senha forte" 
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
                  <FormLabel>Confirme sua senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite a senha novamente" 
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
                  <span className="mr-2">Criando conta...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : "Criar conta"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}