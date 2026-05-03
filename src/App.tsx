import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { userQueries } from './queries/userQueries';

const UserList = lazy(() => import('./components/UserList'));
const UserPosts = lazy(() => import('./components/UserPosts'));

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app">
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
                // 在路由进入前预取数据
                loader={prefetchUsers}
              />
              <Route 
                path="/users/:userId/posts" 
                element={<UserPosts />}
              />
              {/* 未匹配路由重定向 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
