import {queryOptions} from "@tanstack/react-query";
import {api} from "../api";
import type {User} from "../types";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  details: (id: number | string) => [...userKeys.all, "detail", id] as const,
};

export const userQueries = {
  list: () =>
    queryOptions({
      queryKey: userKeys.lists(),
      queryFn: api.fetchUsers,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),

  detail: (id: number | string) =>
    queryOptions({
      queryKey: userKeys.details(id),
      queryFn: async () => {
        const users = await api.fetchUsers();
        return users.find((u: User) => u.id === Number(id)) ?? null;
      },
    }),
};
