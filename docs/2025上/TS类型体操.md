```ts
// Exclude：从联合类型 Type 中排除 Union 的子类型
// Pick 和 Omit 分别是删除和保留 Map 的一部分
type Exclude<T, U> = T extends U ? never : T;

type Extract<T, U> = T extends U ? T : never;

type T1 = Exclude<"a" | "b" | "c", "a" | "b">;   // "c"
type T2 = Extract<string | number | (() => void), Function>; // () => void


// 定义一个对象的 key 和 value 类型
type Record<K extends keyof any, T> = {
  [P in K]: T;
};


// 排除空值
type NonNullable<T> = T extends null | undefined ? never : T;
```

```ts
type Partial<T> = {
    [P in keyof T]?: T[P];
};

type Required<T> = {
    [P in keyof T]-?: T[P];
};

type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};

type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

type MyOmit<T, K extends keyof T> = {
 [P in keyof T as P extends K ? never : P]: T[P]
}

Pick 举例：
type Animal = {
  name: string,
  category: string,
  age: number,
  eat: () => number
}

const bird: Pick<Animal, "name" | "age"> = { name: 'bird', age: 1 }
```
