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
| 路由预取 | `queryClient.ensureQueryData()` 配合路由 `loader` |
| 懒加载 | 路由组件 `lazy()` + `Suspense` fallback |
