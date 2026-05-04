import {useInfiniteQuery} from "@tanstack/react-query";
import {photoQueries} from "../queries/photoQueries";
import type {Photo} from "../types";

const PhotoInfinite = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery(photoQueries.infinite());

  return (
    <div className="photos-container">
      <h1>Photos — Infinite Scroll</h1>
      <div className="photos-grid">
        {data?.pages.map((page) =>
          page.map((photo: Photo) => (
            <div key={photo.id} className="photo-card">
              <img src={photo.thumbnailUrl} alt={photo.title} loading="lazy" />
              <p>{photo.title}</p>
            </div>
          ))
        )}
      </div>
      <div className="pagination-controls">
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading more..." : hasNextPage ? "Load More" : "Nothing more to load"}
        </button>
      </div>
      {isFetching && !isFetchingNextPage && <div className="loading-hint">Fetching...</div>}
    </div>
  );
};

export default PhotoInfinite;
