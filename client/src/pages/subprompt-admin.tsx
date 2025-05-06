import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Edit, Check, X, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Subprompt {
  id: number;
  name: string;
  description: string;
  content: string;
  keywords: string[];
  sphere: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres"),
  content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
  keywords: z.string().transform((val) => val.split(",").map((k) => k.trim())),
  sphere: z.string().min(2, "Esfera deve ter pelo menos 2 caracteres"),
  active: z.boolean().default(true),
});

const importSchema = z.object({
  document: z.string().min(20, "Documento deve ter pelo menos 20 caracteres"),
});

export default function SubpromptAdmin() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subpromptToDelete, setSubpromptToDelete] = useState<Subprompt | null>(
    null
  );
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const {
    data: subprompts,
    isLoading,
    error,
  } = useQuery<Subprompt[]>({
    queryKey: ["/api/subprompts"],
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      content: "",
      keywords: "",
      sphere: "",
      active: true,
    },
  });

  const importForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      document: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/subprompts", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprompts"] });
      toast({
        title: "Sucesso",
        description: "Subprompt criado com sucesso",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar subprompt: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof formSchema>;
    }) => {
      const res = await apiRequest("PUT", `/api/subprompts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprompts"] });
      toast({
        title: "Sucesso",
        description: "Subprompt atualizado com sucesso",
      });
      setEditingId(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar subprompt: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/subprompts/${id}`);
      if (!res.ok) {
        throw new Error(`Erro ao excluir: ${res.status} ${res.statusText}`);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprompts"] });
      toast({
        title: "Sucesso",
        description: "Subprompt excluído com sucesso",
      });
      setIsDeleteDialogOpen(false);
      setSubpromptToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir subprompt: " + error.message,
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (values: z.infer<typeof importSchema>) => {
      const res = await apiRequest("POST", "/api/subprompts/seed", values);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprompts"] });
      toast({
        title: "Sucesso",
        description: `${data.created} subprompts importados com sucesso`,
      });
      setIsImportDialogOpen(false);
      importForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao importar subprompts: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const onImport = (values: z.infer<typeof importSchema>) => {
    importMutation.mutate(values);
  };

  const handleEdit = (subprompt: Subprompt) => {
    setEditingId(subprompt.id);
    form.reset({
      name: subprompt.name,
      description: subprompt.description,
      content: subprompt.content,
      keywords: subprompt.keywords.join(", "),
      sphere: subprompt.sphere,
      active: subprompt.active,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset();
  };

  const confirmDelete = (subprompt: Subprompt) => {
    setSubpromptToDelete(subprompt);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (subpromptToDelete) {
      deleteMutation.mutate(subpromptToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="mr-2 h-16 w-16 animate-spin" />
        <span className="text-xl">Carregando subprompts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <h3 className="text-xl text-red-500 mb-2">
          Erro ao carregar subprompts
        </h3>
        <p>{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Administração de Subprompts</h1>
          <p className="text-muted-foreground">
            Gerencie os subprompts usados pelo IMT-AI
          </p>
        </div>
        <Button onClick={() => setIsImportDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Importar Subprompts
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId !== null ? "Editar Subprompt" : "Novo Subprompt"}
              </CardTitle>
              <CardDescription>
                {editingId !== null
                  ? "Atualize os detalhes do subprompt"
                  : "Crie um novo subprompt para o IMT-AI"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Governance Sphere"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sphere"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Esfera</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Governance"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Categoria principal do subprompt
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Breve descrição do propósito deste subprompt"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conteúdo completo do subprompt que será enviado ao LLM"
                            {...field}
                            className="min-h-32"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palavras-chave</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: governance, blockchain, DAO, voting"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Palavras-chave separadas por vírgula
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Ativo</FormLabel>
                          <FormDescription>
                            Se desativado, este subprompt não será usado pelo
                            IMT-AI
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    {editingId !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                    >
                      {(createMutation.isPending ||
                        updateMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingId !== null ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Atualizar
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Criar
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Subprompts Existentes</h2>
          {subprompts?.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum subprompt encontrado. Crie um novo ou importe do documento.
            </p>
          ) : (
            <div className="space-y-4">
              {subprompts?.map((subprompt) => (
                <Card
                  key={subprompt.id}
                  className={`${
                    editingId === subprompt.id
                      ? "border-primary"
                      : subprompt.active
                      ? ""
                      : "opacity-70"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {subprompt.name}
                          {!subprompt.active && (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Esfera: {subprompt.sphere}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(subprompt)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => confirmDelete(subprompt)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{subprompt.description}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {subprompt.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Conteúdo com {subprompt.content.length} caracteres
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground">
                    Criado em:{" "}
                    {new Date(subprompt.createdAt).toLocaleDateString("pt-BR")}
                    {subprompt.updatedAt > subprompt.createdAt && (
                      <span className="ml-2">
                        Atualizado em:{" "}
                        {new Date(subprompt.updatedAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o subprompt &quot;
              {subpromptToDelete?.name}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Subprompts</DialogTitle>
            <DialogDescription>
              Cole o conteúdo do documento Grimório de Subprompts para importar
              automaticamente todos os subprompts definidos nele.
            </DialogDescription>
          </DialogHeader>

          <Form {...importForm}>
            <form
              onSubmit={importForm.handleSubmit(onImport)}
              className="space-y-4"
            >
              <FormField
                control={importForm.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Cole aqui o conteúdo do documento Grimório de Subprompts..."
                        className="min-h-[300px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      O documento deve seguir o formato padrão com as seções
                      &quot;### X. Nome&quot; e as subseções &quot;**Description:**&quot; e
                      &quot;**Keywords:**&quot;
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Importar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}