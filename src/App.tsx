import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {lazy, Suspense} from 'react';
import {BrowserRouter, Navigate, NavLink, Route, Routes} from 'react-router-dom';
import {userQueries} from './queries/userQueries';

const UserList = lazy(() => import('./components/UserList'));
const UserPosts = lazy(() => import('./components/UserPosts'));
const PhotoPagination = lazy(() => import('./components/PhotoPagination'));
const PhotoInfinite = lazy(() => import('./components/PhotoInfinite'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

const prefetchUsers = () => {
  return queryClient.ensureQueryData(userQueries.list())
}

const navItems = [
  {to: '/', label: 'Users'},
  {to: '/photos', label: 'Photos Pagination'},
  {to: '/photos/infinite', label: 'Photos Infinite'},
]

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-layout">
          <nav className="sidebar">
            <div className="sidebar-title">React Query Demo</div>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({isActive}) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="main-content">
            <Suspense
              fallback={
                <div className="loading-screen">
                  <div className="spinner">Loading...</div>
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={<UserList />}
                  loader={prefetchUsers}
                />
                <Route
                  path="/users/:userId/posts"
                  element={<UserPosts />}
                />
                <Route
                  path="/photos"
                  element={<PhotoPagination />}
                />
                <Route
                  path="/photos/infinite"
                  element={<PhotoInfinite />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
