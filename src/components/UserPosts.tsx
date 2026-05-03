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
	const queryClient = useQueryClient()
	const [newPostTitle, setNewPostTitle] = useState('')
	const [newPostBody, setNewPostBody] = useState('')
	const [editingId, setEditingId] = useState<number | null>(null)
	const [editTitle, setEditTitle] = useState('')
	const [editBody, setEditBody] = useState('')

	const { data: posts } = useSuspenseQuery(postQueries.byUser(userId));
  const { data: user } = useSuspenseQuery(userQueries.detail(userId));

	const createMutation = useMutation({
		mutationFn: ({ title, body }: { title: string; body: string }) =>
			api.createPost({
				title,
        userId: Number(userId),
        body
			}),
			onSuccess: (newPost) => {
				queryClient.setQueryData(postKeys.byUser(userId), (old: Post[] | undefined) =>
					old ? [...old, newPost] : [newPost]
				)
				setNewPostTitle("")
				setNewPostBody("")
			}
	})

	const updateMutation = useMutation({
		mutationFn: (post: Post) =>
			api.updatePost({ id: post.id, title: post.title, body: post.body }),
		onSuccess: (updatedPost) => {
			queryClient.setQueryData(postKeys.byUser(userId), (old: Post[] | undefined) =>
				old?.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p)
			)
			setEditingId(null)
		}
	})

	const handleSubmit = (e: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
		e.preventDefault();
    if (newPostTitle.trim()) {
      createMutation.mutate({ title: newPostTitle, body: newPostBody });
    }
	}

	const startEdit = (post: Post) => {
		setEditingId(post.id)
		setEditTitle(post.title)
		setEditBody(post.body)
	}

	const handleUpdate = (e: SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!editTitle.trim() || editingId === null) return
		const post = posts.find(p => p.id === editingId)
		if (post) {
			updateMutation.mutate({ ...post, title: editTitle, body: editBody })
		}
	}

	const cancelEdit = () => {
		setEditingId(null)
		setEditTitle('')
		setEditBody('')
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
        <textarea
          value={newPostBody}
          onChange={e => setNewPostBody(e.target.value)}
          placeholder="Enter post content..."
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
            {editingId === post.id ? (
              <form onSubmit={handleUpdate} className="edit-post-form">
                <div className="edit-post-fields">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title..."
                    disabled={updateMutation.isPending}
                  />
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    placeholder="Body..."
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="edit-post-actions">
                  <button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={cancelEdit} className="btn-cancel">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="post-header">
                  <h3>{post.title}</h3>
                  <button className="btn-edit" onClick={() => startEdit(post)}>Edit</button>
                </div>
                <p>{post.body || 'No content available'}</p>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
	)
}

export default UserPosts
