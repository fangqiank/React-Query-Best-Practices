import {infiniteQueryOptions, queryOptions, keepPreviousData} from "@tanstack/react-query";
import {api} from "../api";

export const photoKeys = {
  all: ["photos"] as const,
  paginated: (page: number, limit: number) =>
    [...photoKeys.all, "paginated", page, limit] as const,
  infinite: () => [...photoKeys.all, "infinite"] as const,
};

export const photoQueries = {
  paginated: (page: number, limit: number) =>
    queryOptions({
      queryKey: photoKeys.paginated(page, limit),
      queryFn: () => api.fetchPhotos(page, limit),
      placeholderData: keepPreviousData,
    }),

  infinite: () =>
    infiniteQueryOptions({
      queryKey: photoKeys.infinite(),
      queryFn: ({pageParam}) => api.fetchPhotos(pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage, _allPages, lastPageParam) =>
        lastPage.length === 0 ? undefined : (lastPageParam as number) + 1,
    }),
};
