import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useState, type SyntheticEvent } from "react"
import { Link, useParams } from "react-router-dom"
import postQueries, { postKeys } from "../queries/postQueries"
import { userQueries } from "../queries/userQueries"
import { api } from "../api"
import type { Post } from "../types"

type PostParams = {
  userId: string
}

const UserPosts = () => {
	const { userId } = useParams<keyof PostParams>() as PostParams;
	const querClient = useQueryClient()
	const [newPostTitle, setNewPostTitle] = useState('')
	
	const { data: posts } = useSuspenseQuery(postQueries.byUser(userId));
  const { data: user } = useSuspenseQuery(userQueries.detail(userId));

	const createMutation = useMutation({
		mutationFn: (title: string) =>
			api.createPost({
				title,
        userId: Number(userId),
        body: ''
			}),
			onSuccess: (newPost) => {
				querClient.setQueryData(postKeys.byUser(userId), (old: Post[] | undefined) =>
					old ? [...old, newPost] : [newPost]
				)
				setNewPostTitle("")
			}
	})

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
		e.preventDefault();
    if (newPostTitle.trim()) {
      createMutation.mutate(newPostTitle);
    }
	}

	return (
		<div className="posts-container">
      <Link to="/" className="back-link">← Back to Users</Link>
      
      {user && <h1>{user.name}'s Posts</h1>}
      
      <form onSubmit={handleSubmit} className="create-post-form">
        <input 
          value={newPostTitle}
          onChange={e => setNewPostTitle(e.target.value)}
          placeholder="Enter new post title..."
          disabled={createMutation.isPending}
        />
        <button 
          type="submit" 
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating...' : 'Add Post'}
        </button>
        {createMutation.isSuccess && (
          <span className="success-message">✓ Post created!</span>
        )}
        {createMutation.isError && (
          <span className="error-message">✗ Failed to create post</span>
        )}
      </form>

      <div className="posts-list">
        {posts.map((post: Post) => (
          <article key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p>{post.body || 'No content available'}</p>
          </article>
        ))}
      </div>
    </div>
	)
}

export default UserPosts