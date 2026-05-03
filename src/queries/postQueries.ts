import {queryOptions} from "@tanstack/react-query";
import {api} from "../api";

export const postKeys = {
  all: ["posts"] as const,
  byUser: (userId: number | string) =>
    [...postKeys.all, "byUser", userId] as const,
};

const postQueries = {
  byUser: (userId: number | string) =>
    queryOptions({
      queryKey: postKeys.byUser(userId),
      queryFn: () => api.fetchPostsByUserId(Number(userId)),
      enabled: Boolean(userId),
    }),
};

export default postQueries;
