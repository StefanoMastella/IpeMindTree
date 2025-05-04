import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Simulação de login - em uma versão real, isso seria conectado à API
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simula processamento
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O sistema de autenticação será implementado na próxima versão.",
        variant: "default",
      });
    }, 1000);
  };

  // Simulação de registro - em uma versão real, isso seria conectado à API
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Simula processamento
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O sistema de registro será implementado na próxima versão.",
        variant: "default",
      });
    }, 1000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna esquerda - Formulários */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Ipê Mind Tree
            </h1>
            <p className="text-muted-foreground mb-8">
              Acesse a plataforma e contribua com o conhecimento coletivo.
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Entre com suas credenciais para acessar sua conta.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nome de usuário</Label>
                      <Input 
                        id="username" 
                        placeholder="Seu nome de usuário" 
                        value={loginData.username}
                        onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="Sua senha" 
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Processando..." : "Entrar"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Cadastro</CardTitle>
                  <CardDescription>
                    Crie uma conta para participar da comunidade Ipê Mind Tree.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Nome de usuário</Label>
                      <Input 
                        id="register-username" 
                        placeholder="Escolha um nome de usuário" 
                        value={registerData.username}
                        onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <Input 
                        id="register-password" 
                        type="password" 
                        placeholder="Escolha uma senha segura" 
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Confirmar senha</Label>
                      <Input 
                        id="register-confirm" 
                        type="password" 
                        placeholder="Confirme sua senha" 
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Processando..." : "Criar conta"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna direita - Hero section */}
        <div className="hidden md:flex flex-col justify-center">
          <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-8 backdrop-blur">
            <h2 className="text-2xl font-bold mb-4">Bem-vindo ao Ipê Mind Tree</h2>
            <p className="mb-6 text-muted-foreground">
              Uma plataforma colaborativa onde ideias se conectam e evoluem através da 
              inteligência coletiva. Compartilhe suas ideias, explore conexões e 
              contribua para o crescimento do conhecimento compartilhado.
            </p>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Compartilhe Ideias</h3>
                  <p className="text-sm text-muted-foreground">Contribua com suas ideias e veja como elas se conectam com outras</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Conecte Conhecimento</h3>
                  <p className="text-sm text-muted-foreground">Explore mapas mentais e conexões que enriquecem o entendimento</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium">Converse com IA</h3>
                  <p className="text-sm text-muted-foreground">Interaja com nossa IA que aprende continuamente com as ideias compartilhadas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}