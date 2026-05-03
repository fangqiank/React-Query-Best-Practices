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
