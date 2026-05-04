# React Query Best Practices

TanStack React Query v5 最佳实践示例项目。

## 技术栈

- React 19 + TypeScript 6
- TanStack React Query v5
- React Router DOM v7
- Vite 8
- pnpm

## 开发

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## 核心模式

### 三层分离

```
src/types/index.ts    → 共享类型定义
src/api/index.ts      → 纯 fetch 请求，不感知 React Query
src/queries/*.ts      → 集中的 query keys + queryOptions() 工厂
src/components/*.tsx  → useSuspenseQuery / useMutation 消费查询
```

### 关键实践

| 模式 | 说明 |
|------|------|
| `queryOptions()` | 所有查询通过 `queryOptions()` 定义，组件不内联 queryKey/queryFn |
| `useSuspenseQuery` | 组件使用 Suspense 模式，data 始终有值 |
| Query Key 层级 | `["users", "list"]` / `["users", "detail", id]` / `["posts", "byUser", userId]` |
| `setQueryData` | mutation 成功后直接更新缓存，而非 refetch（因为 JSONPlaceholder 不持久化 POST） |
| Create Post | `POST /posts`，成功后 `setQueryData` 追加新帖子到缓存列表 |
| Update Post | `PATCH /posts/:id`，成功后 `setQueryData` 替换缓存中对应帖子 |
| 路由预取 | `queryClient.ensureQueryData()` 配合路由 `loader` |
| 懒加载 | 路由组件 `lazy()` + `Suspense` fallback |

## 核心概念详解

### queryKey — 缓存的唯一标识

`queryKey` 是 React Query 缓存系统的唯一标识，相当于缓存的"门牌号"。React Query 用它做三件事：

1. **存** — fetch 到的数据以 `queryKey` 为键存入缓存
2. **取** — 组件通过 `queryKey` 从缓存中读取数据
3. **失效/更新** — 通过 `queryKey` 精准定位要刷新或覆盖的缓存

**重要**：`queryKey` 中的参数是查询参数（区分不同请求），不是返回值。真正的数据由 `queryFn` 执行后自动存入缓存。

```
queryKey（键）                        → 缓存数据（值）
─────────────────────────────────────────────────────
["posts", "byUser", 1]                → [{id:1, title:"..."}, {id:2, title:"..."}]
["posts", "byUser", 2]                → [{id:3, title:"..."}, {id:4, title:"..."}]
```

### ensureQueryData — 幂等预取

`ensureQueryData` 的作用：缓存已有数据则直接返回，没有则执行 fetch 获取并写入缓存。

```ts
const prefetchUsers = () => {
  return queryClient.ensureQueryData(userQueries.list())
}
```

与 `prefetchQuery` 的区别：`ensureQueryData` 返回数据本身，`prefetchQuery` 返回 `Promise<void>`。在路由 `loader` 中需要返回数据时，`ensureQueryData` 更合适。

### lazy 懒加载

`React.lazy()` + `import()` 实现路由级代码分割：

```tsx
const UserList = lazy(() => import('./components/UserList'))
```

- `import()` 动态导入 — 构建时目标模块会被拆分成独立 chunk
- `lazy()` — 返回延迟加载组件，首次渲染时才触发下载
- `<Suspense fallback={...}>` — 组件加载期间显示 fallback，加载完成后切换

**收益**：首屏只下载当前页面代码，未访问的页面不会加载，bundle 更小，加载更快。

### useSuspenseQuery vs useQuery

| | `useQuery` | `useSuspenseQuery` |
|---|---|---|
| 加载中返回值 | `{ data: undefined, isLoading: true }` | 挂起组件，触发最近 `<Suspense>` |
| 数据类型 | `data` 可能是 `undefined` | `data` 始终有值，类型确定 |
| 手动处理 loading | 需要 `if (isLoading)` | 不需要，Suspense 统一处理 |
| 手动处理 error | 需要 `if (isError)` | 不需要，Error Boundary 统一处理 |

本项目统一使用 `useSuspenseQuery`，组件内只需关注数据本身，loading/error 交给外层 `<Suspense>` 和 Error Boundary。

### setQueryData vs invalidateQueries (refetch)

| | `setQueryData` | `invalidateQueries` + refetch |
|---|---|---|
| 触发网络请求 | 不发请求，直接改缓存 | 重新发 fetch 请求 |
| 数据来源 | mutation 的返回值 | 服务器最新数据 |
| 速度 | 即时，无网络延迟 | 需等请求完成 |
| 准确性 | 自己保证数据正确 | 服务器是唯一真相 |

**本项目使用 `setQueryData` 的原因**：JSONPlaceholder 是模拟 API，POST 请求不会真正持久化数据。如果用 `invalidateQueries` 触发重新 fetch，服务器返回的还是原数据——刚创建的帖子会"消失"。所以必须用 `setQueryData` 直接把新数据写入缓存。

```ts
// 创建帖子：直接把 newPost 追加到缓存
onSuccess: (newPost) => {
  queryClient.setQueryData(postKeys.byUser(userId), (old) =>
    old ? [...old, newPost] : [newPost]
  )
}
```

**真实后端场景应使用 `invalidateQueries`**：数据会持久化到数据库，重新 fetch 能拿到包含新数据的完整列表，服务器是权威数据源，refetch 更可靠。

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: postKeys.byUser(userId) })
}
```

- **模拟 API / 已知确切返回值** → `setQueryData`（即时、无网络开销）
- **真实后端** → `invalidateQueries`（重新 fetch 保证数据一致）

### queryOptions 中的 enabled — 条件开关

`enabled` 控制查询是否执行，`false` 时不发请求，查询处于暂停状态。

```ts
queryOptions({
  queryKey: postKeys.byUser(userId),
  queryFn: () => api.fetchPostsByUserId(Number(userId)),
  enabled: Boolean(userId),  // userId 存在时才发请求
})
```

| `enabled` 值 | 行为 | 查询状态 |
|---|---|---|
| `true` | 自动发请求 | `pending` → `success` / `error` |
| `false` | 不发请求，不进缓存 | `status: "pending"`，`fetchStatus: "idle"` |

典型用法：
- **依赖前置数据**：`enabled: Boolean(userId)` — 参数没准备好不请求
- **多条件依赖**：`enabled: Boolean(userId) && Boolean(postId)`
- **手动触发**：`enabled: false` 配合 `refetch()` 手动控制

### staleTime — 数据保鲜期

`staleTime` 控制数据从"新鲜"变为"过期"的时间，设在 `queryOptions` 里。

```
数据获取后 ──→ fresh（新鲜期）──→ stale（过期）
               ←── staleTime ──→

fresh 期间：组件重新 mount 直接用缓存，不发请求
stale 之后：组件重新 mount 会触发后台 refetch
```

| `staleTime` | 行为 |
|---|---|
| `0`（默认） | 数据拿到就立刻变 stale，每次 mount 都 refetch |
| `5 * 60 * 1000` | 5 分钟内不 refetch |
| `Infinity` | 永远不会自动 refetch |

三种设定层级：

```ts
// 1. 全局默认（App.tsx）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 }
  }
})

// 2. queryOptions 中单独设定（推荐）
queryOptions({
  queryKey: postKeys.byUser(userId),
  queryFn: () => api.fetchPostsByUserId(Number(userId)),
  staleTime: 10 * 60 * 1000,
})

// 3. useSuspenseQuery 中覆盖
useSuspenseQuery({
  ...postQueries.byUser(userId),
  staleTime: 2 * 60 * 1000,
})
```

本项目当前未设定，默认 `0`（每次 mount 都 refetch）。

### useMutation 回调执行顺序

```ts
useMutation({
  mutationFn: api.createPost,
  onMutate: (variables) => {    // 1. 请求发出前，最先执行
  },
  onSuccess: (data, variables, context) => {  // 2. 请求成功后
  },
  onError: (error, variables, context) => {    // 2. 请求失败后
  },
  onSettled: (data, error, variables, context) => {  // 3. 无论成功失败都执行
  },
})
```

### onMutate — 乐观更新

`onMutate` 在 mutation 请求发出**前**执行，核心用途是乐观更新：不等服务器响应，先假设成功更新 UI，失败再回滚。

```ts
useMutation({
  mutationFn: (newTitle) => api.updatePost({ id: 1, title: newTitle }),
  onMutate: async (newTitle) => {
    // 1. 取消正在进行的查询，避免覆盖乐观更新
    await queryClient.cancelQueries({ queryKey: postKeys.byUser(userId) })
    // 2. 保存当前缓存快照，用于失败时回滚
    const previousPosts = queryClient.getQueryData(postKeys.byUser(userId))
    // 3. 乐观更新：先改缓存，UI 立刻反映
    queryClient.setQueryData(postKeys.byUser(userId), (old) =>
      old?.map(p => p.id === 1 ? { ...p, title: newTitle } : p)
    )
    // 4. 返回快照，供 onError 回滚使用
    return { previousPosts }
  },
  onError: (err, newTitle, context) => {
    // 失败了，用快照回滚
    queryClient.setQueryData(postKeys.byUser(userId), context.previousPosts)
  },
})
```

| | `onMutate`（乐观更新） | `onSuccess`（本项目用法） |
|---|---|---|
| 执行时机 | 请求发出**前** | 请求成功**后** |
| UI 更新时机 | 立刻（不等服务器） | 等服务器确认后 |
| 需要回滚 | 是，失败要恢复 | 不需要，只有成功才更新 |
| 适用场景 | 要求即时反馈 | 数据准确性优先 |

### Pagination — 分页查询

核心：**页码加入 queryKey**（每页独立缓存）+ **`keepPreviousData`**（翻页保留旧数据避免闪烁）。

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query'

function PostList() {
  const [page, setPage] = useState(0)

  const { data, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['posts', page],           // page 变了 → 新缓存条目 → 自动 refetch
    queryFn: () => fetchPosts(page),
    placeholderData: keepPreviousData,    // 翻页时保留上一页数据，避免闪烁
  })

  return (
    <>
      {data?.map(post => <p key={post.id}>{post.title}</p>)}
      <button onClick={() => setPage(old => Math.max(old - 1, 0))}>上一页</button>
      <button onClick={() => setPage(old => old + 1)} disabled={isPlaceholderData}>下一页</button>
      {isFetching && <span>加载中...</span>}
    </>
  )
}
```

**queryKey 与缓存对应关系**：

```
queryKey: ['posts', 0]  → 第 1 页缓存
queryKey: ['posts', 1]  → 第 2 页缓存
queryKey: ['posts', 2]  → 第 3 页缓存
```

每个页码是独立缓存，来回翻页时已访问过的页面直接命中。

**`keepPreviousData` 的作用**：

```
没有 keepPreviousData：翻页 → 旧数据消失 → loading → 新数据出现（闪烁）
有 keepPreviousData：  翻页 → 旧数据继续显示 → 新数据静默替换（平滑）
```

**`isPlaceholderData`**：当前显示的是上一页的占位数据，非真实新页数据。可用于禁用翻页按钮防止重复点击。

**两种策略对比**：

| | `useQuery` + `keepPreviousData` | `useSuspenseQuery` |
|---|---|---|
| 翻页体验 | 保留旧数据，无缝替换 | 挂起组件，显示 fallback |
| 缓存 | 每页独立缓存，来回翻秒出 | 同样独立缓存 |
| 适用场景 | 列表分页，追求平滑 | 首次加载为主 |

### Infinite Queries — 无限滚动加载

用 `useInfiniteQuery` 实现"加载更多"或"无限滚动"，数据**逐页累积**而不是替换。

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'

function InfinitePosts() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/posts?cursor=${pageParam}&limit=10`)
      return res.json() // { data: [...], nextCursor: 123 }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  return (
    <>
      {data?.pages.map((page) =>
        page.data.map(post => <p key={post.id}>{post.title}</p>)
      )}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? '加载中...' : hasNextPage ? '加载更多' : '没有更多了'}
      </button>
    </>
  )
}
```

**数据累积结构**：

```ts
// 普通分页 useQuery：每次只存一页
data = [{ id: 1 }, { id: 2 }, ...]          // 第 2 页（第 1 页没了）

// 无限查询 useInfiniteQuery：所有页累积
data = {
  pages: [
    { data: [{ id: 1 }, { id: 2 }] },        // 第 1 页
    { data: [{ id: 3 }, { id: 4 }] },        // 第 2 页
    { data: [{ id: 5 }, { id: 6 }] },        // 第 3 页
  ],
  pageParams: [0, 123, 456],                  // 每页的参数
}
```

**核心参数**：

- `initialPageParam` — 首次请求的参数值
- `getNextPageParam` — 返回下一页参数，返回 `undefined` 表示没有更多了
- `fetchNextPage()` — 手动触发加载下一页
- `hasNextPage` — 是否还有下一页

**配合 IntersectionObserver 自动加载**：

```tsx
const lastElementRef = useCallback((node) => {
  if (isFetchingNextPage) return
  if (observerRef.current) observerRef.current.disconnect()
  observerRef.current = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasNextPage) {
      fetchNextPage()
    }
  })
  if (node) observerRef.current.observe(node)
}, [isFetchingNextPage, hasNextPage, fetchNextPage])
```

**与普通分页对比**：

| | `useQuery` 分页 | `useInfiniteQuery` 无限滚动 |
|---|---|---|
| 数据结构 | 每页独立，来回翻页 | 所有页累积，只往后加载 |
| 翻页方式 | 上一页 / 下一页 | 加载更多 / 无限滚动 |
| 缓存 | 每页一个缓存条目 | 一个 queryKey 存所有页 |
| 适用场景 | 搜索结果、表格分页 | 社交动态、商品列表流 |
