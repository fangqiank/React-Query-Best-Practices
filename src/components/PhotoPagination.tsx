import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {photoQueries} from "../queries/photoQueries";
import type {Photo} from "../types";

const LIMIT = 20;

const PhotoPagination = () => {
  const [page, setPage] = useState(1);
  const {data: photos = [], isPlaceholderData, isFetching} = useQuery(photoQueries.paginated(page, LIMIT));

  return (
    <div className="photos-container">
      <h1>Photos — Pagination</h1>
      <div className="photos-grid">
        {photos?.map((photo: Photo) => (
          <div key={photo.id} className="photo-card">
            <img src={photo.thumbnailUrl} alt={photo.title} loading="lazy" />
            <p>{photo.title}</p>
          </div>
        ))}
      </div>
      <div className="pagination-controls">
        <button
          onClick={() => setPage(old => Math.max(old - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="page-info">
          Page {page} {isPlaceholderData && "(loading...)"}
        </span>
        <button
          onClick={() => setPage(old => old + 1)}
          disabled={photos.length < LIMIT || isPlaceholderData}
        >
          Next
        </button>
      </div>
      {isFetching && !isPlaceholderData && <div className="loading-hint">Fetching...</div>}
    </div>
  );
};

export default PhotoPagination;
