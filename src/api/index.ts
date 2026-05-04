import type {User, Post, NewPost, UpdatePost, Photo} from "../types";

const BASE_URL = "https://jsonplaceholder.typicode.com";

export const api = {
  fetchUsers: async (): Promise<User[]> => {
    const res = await fetch(`${BASE_URL}/users`);
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  fetchPostsByUserId: async (userId: number): Promise<Post[]> => {
    const res = await fetch(`${BASE_URL}/posts?userId=${userId}`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    return res.json();
  },

  createPost: async (newPost: NewPost): Promise<Post> => {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: "POST",
      body: JSON.stringify(newPost),
      headers: {"Content-type": "application/json; charset=UTF-8"},
    });
    if (!res.ok) throw new Error("Failed to create post");
    return res.json();
  },

  updatePost: async (post: UpdatePost): Promise<Post> => {
    const res = await fetch(`${BASE_URL}/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify(post),
      headers: {"Content-type": "application/json; charset=UTF-8"},
    });
    if (!res.ok) throw new Error("Failed to update post");
    return res.json();
  },

  fetchPhotos: async (page: number, limit: number): Promise<Photo[]> => {
    const res = await fetch(`${BASE_URL}/photos?_page=${page}&_limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch photos");
    return res.json();
  },
};
