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
