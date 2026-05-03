import { useSuspenseQuery } from "@tanstack/react-query"
import { userQueries } from "../queries/userQueries"
import type { User } from "../types"
import { Link } from "react-router-dom"

const UserList = () => {
	const {data: users} = useSuspenseQuery(userQueries.list())

	return (
		<div className="users-container">
      <h1>Users Directory</h1>
      <div className="users-grid">
        {users.map((user: User) => (
          <Link 
            to={`/users/${user.id}/posts`} 
            key={user.id}
            className="user-card"
          >
            <h2>{user.name}</h2>
            <p className="email">📧 {user.email}</p>
            <p className="company">🏢 {user.company.name}</p>
          </Link>
        ))}
      </div>
    </div>
	)
}

export default UserList