import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth as useAuthContext } from "../lib/auth-context";

export function useAuth() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) => 
      auth.login(credentials.username, credentials.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: { username: string; email: string; password: string }) => 
      auth.register(userData.username, userData.email, userData.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    loginMutation,
    logoutMutation,
    registerMutation
  };
}