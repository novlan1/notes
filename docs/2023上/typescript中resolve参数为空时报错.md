`v3.9.5`版本类型为：

```ts
new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
```


`typescript`的`v4.9.5`版本中`Promise`类型为：

```ts
new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
```

会导致`resolve()`在有些机器上编译报错，有些不报错。


参考：
- https://github.com/microsoft/TypeScript/blob/v3.9.5/lib/lib.es2015.promise.d.ts
- https://github.com/microsoft/TypeScript/blob/v4.9.5/lib/lib.es2015.promise.d.ts


