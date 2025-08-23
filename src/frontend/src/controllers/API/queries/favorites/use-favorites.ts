import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../index";

export interface UserFavorite {
  id: string;
  user_id: string;
  item_id: string;
  item_type: "FLOW" | "COMPONENT";
  item_name: string;
  item_description?: string;
  item_author?: string;
  created_at: string;
}

export interface FavoriteToggleRequest {
  item_id: string;
  item_type: "FLOW" | "COMPONENT";
  item_name: string;
  item_description?: string;
  item_author?: string;
}

export interface FavoriteToggleResponse {
  is_favorited: boolean;
  message: string;
  favorite_id?: string;
}

// Get all user favorites
export function useGetUserFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async (): Promise<UserFavorite[]> => {
      const response = await api.get("/favorites/");
      return response.data;
    },
  });
}

// Get favorite item IDs for quick lookup
export function useGetFavoriteItemIds() {
  return useQuery({
    queryKey: ["favorites", "item-ids"],
    queryFn: async (): Promise<string[]> => {
      const response = await api.get("/favorites/item-ids");
      return response.data;
    },
  });
}

// Toggle favorite mutation
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: FavoriteToggleRequest): Promise<FavoriteToggleResponse> => {
      const response = await api.post("/favorites/toggle", request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch favorites data
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

// Create favorite mutation
export function useCreateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: FavoriteToggleRequest): Promise<UserFavorite> => {
      const response = await api.post("/favorites/", request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

// Delete favorite mutation
export function useDeleteFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<{ message: string }> => {
      const response = await api.delete(`/favorites/${itemId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
