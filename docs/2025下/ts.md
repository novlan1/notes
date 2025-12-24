# 类型导出

1. `export * from 'module'` 重新导出目标模块的所有导出（包括类型和值）。
2. `export type * from 'module'` 只重新导出目标模块的所有类型导出（TypeScript 4.5 及以上）。
3. `export * as ns from 'module'` 将目标模块的所有导出作为一个命名空间对象重新导出。

命名空间导出可以导出类型，要注意类型必须与值一起。

如果源模块只有类型导出而没有值导出：

```ts
// types-only.ts
export interface User { name: string }
export type Status = 'active' | 'inactive';
// 注意：没有导出任何值（如类、函数、变量）

// index.ts
export * as Types from './types-only';  // ⚠️ 问题：运行时 Types 可能是 undefined
```

这种情况下，更好的做法是：

```ts
// 方案1：使用 export type *
export type * as Types from './types-only';

// 方案2：创建有值的模块
// types-with-value.ts
export interface User { name: string }
export type Status = 'active' | 'inactive';
export const TYPES_VERSION = '1.0';  // 添加一个值导出

// index.ts
export * as Types from './types-with-value';  // ✅ 现在有值了
```



# **`declare` 的含义和 `.d.ts` 文件的编写**

## 1. **`declare` 的含义**

`declare` 关键字用于**声明**（而不是定义）在 TypeScript 编译环境中存在的某个东西，但这个东西的实际实现可能在其他地方。

### 核心概念
```typescript
// 声明：告诉 TypeScript "这个存在"，但不提供实现
declare const VERSION: string;  // 这个变量存在，类型是 string
declare function log(message: string): void;  // 这个函数存在
declare class MyClass {  // 这个类存在
  constructor(name: string);
  getName(): string;
}
```

### `declare` 的作用范围
```typescript
// 1. 声明全局变量（存在于全局作用域）
declare const API_URL: string;

// 2. 声明函数
declare function fetchData(url: string): Promise<any>;

// 3. 声明类
declare class EventEmitter {
  on(event: string, handler: Function): void;
  emit(event: string, data?: any): void;
}

// 4. 声明命名空间/模块
declare namespace MyLib {
  const version: string;
  function calculate(): number;
}

// 5. 声明类型/接口（通常不需要 declare）
interface User {  // 接口声明不需要 declare
  name: string;
  age: number;
}
```

## 2. **`declare` 的四种主要用途**

### 用途 1：声明全局变量
```typescript
// 告诉 TypeScript window 对象上有 myApp
declare global {
  interface Window {
    myApp: {
      version: string;
      init(): void;
    };
  }
}

// 使用
window.myApp.init();  // 现在 TypeScript 知道 myApp 存在
```

### 用途 2：为外部 JavaScript 库提供类型
```typescript
// 为第三方库 jquery 提供类型
declare namespace $ {
  // 声明 $ 命名空间
  function ajax(url: string, options?: any): Promise<any>;
  const version: string;
  function ready(callback: () => void): void;
}
```

### 用途 3：声明环境变量/配置
```typescript
// 声明构建时注入的环境变量
declare const ENV: 'development' | 'production' | 'test';
declare const API_BASE_URL: string;
declare const BUILD_TIME: string;

// 使用
if (ENV === 'development') {
  console.log('开发环境');
}
```

### 用途 4：声明模块类型
```typescript
// 为图片文件声明模块类型
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: React.FC<React.SVGProps<SVGSVGElement>>;
  export default value;
}

// 为没有类型定义的 JS 库声明模块
declare module 'some-untyped-js-lib' {
  export function doSomething(): void;
  export default function createInstance(config: any): any;
}
```

## 3. **`.d.ts` 文件的完整编写指南**

### 3.1 基本结构
```typescript
// 文件：types/global.d.ts

// 1. 声明全局类型
declare type ID = string | number;

// 2. 声明全局接口
interface Window {
  __REDUX_DEVTOOLS_EXTENSION__?: Function;
}

// 3. 声明全局变量
declare const __DEV__: boolean;

// 4. 声明全局函数
declare function debugLog(...args: any[]): void;
```

### 3.2 为第三方库编写声明文件
```typescript
// 文件：@types/my-library/index.d.ts

// 模块声明
declare module 'my-library' {
  // 导出类型
  export interface Config {
    timeout?: number;
    retry?: boolean;
  }

  // 导出函数
  export function initialize(config: Config): Promise<void>;
  export function request(endpoint: string, options?: any): Promise<any>;

  // 导出类
  export class Client {
    constructor(apiKey: string);
    get(endpoint: string): Promise<any>;
  }

  // 导出变量
  export const version: string;
  export const defaultConfig: Config;

  // 默认导出
  export default Client;
}
```

### 3.3 模块扩展声明
```typescript
// 文件：vue-shim.d.ts
declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

// 文件：custom-module.d.ts
// 扩展现有模块的类型
declare module 'vue' {
  interface ComponentCustomProperties {
    $filters: {
      formatDate(date: Date): string;
      truncate(text: string, length: number): string;
    };
  }
}
```

### 3.4 全局增强
```typescript
// 文件：global.d.ts
import { MyCustomType } from './types';

// 扩展全局命名空间
declare global {
  // 扩展 Window
  interface Window {
    analytics: {
      track(event: string, data?: any): void;
    };
  }

  // 扩展 Document
  interface Document {
    fullscreenElement: Element | null;
  }

  // 扩展内置类型
  interface String {
    toCamelCase(): string;
  }

  // 声明全局类型
  type Maybe<T> = T | null | undefined;

  // 声明全局变量
  var __VERSION__: string;
  const __BUILD_TIME__: string;
}
```

## 4. **完整的 `.d.ts` 文件示例**

### 示例 1：完整的库声明文件
```typescript
// 文件：@types/calculator/index.d.ts

// 类型定义
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface CalculatorOptions {
  precision?: number;
  useRounding?: boolean;
}

export interface CalculationResult {
  result: number;
  operation: Operation;
  timestamp: Date;
}

// 主类
export declare class Calculator {
  constructor(options?: CalculatorOptions);

  // 方法
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
  multiply(a: number, b: number): number;
  divide(a: number, b: number): number;

  // 静态方法
  static getOperations(): Operation[];
  static formatResult(result: number, precision: number): string;

  // 属性
  readonly precision: number;
  readonly history: CalculationResult[];

  // 事件相关
  on(event: 'calculate', listener: (result: CalculationResult) => void): void;
  off(event: 'calculate', listener: Function): void;
}

// 工具函数
export declare function createCalculator(options?: CalculatorOptions): Calculator;
export declare function validateNumber(value: any): value is number;

// 默认导出
export default Calculator;
```

### 示例 2：项目类型声明文件
```typescript
// 文件：src/types/index.d.ts

// 基础类型
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 业务类型
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  avatar?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
  };
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page: number;
    total: number;
    pageSize: number;
  };
}

// 事件类型
export type EventMap = {
  'user:created': User;
  'user:updated': Partial<User>;
  'error': Error;
};

export type EventHandler<T = any> = (data: T) => void;

// 全局声明
declare global {
  // 扩展 String
  interface String {
    toTitleCase(): string;
  }

  // 扩展 Array
  interface Array<T> {
    findLast(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined;
  }

  // 全局变量
  const APP_VERSION: string;
  const IS_DEVELOPMENT: boolean;
  const API_ENDPOINT: string;
}
```

## 5. **最佳实践和技巧**

### 5.1 组织结构
```typescript
// 推荐的文件组织
src/
├── @types/                    # 第三方库类型声明
│   ├── untyped-lib.d.ts
│   └── custom-modules.d.ts
├── types/                     # 项目类型声明
│   ├── global.d.ts           # 全局类型
│   ├── api.d.ts              # API 相关类型
│   ├── components.d.ts       # 组件类型
│   └── index.d.ts           # 类型导出入口
└── tsconfig.json
```

### 5.2 类型导出模式
```typescript
// 方式1：统一导出
// types/index.d.ts
export * from './api';
export * from './utils';
export * from './components';

// 方式2：命名空间导出
declare namespace MyApp {
  export interface User { /* ... */ }
  export interface Product { /* ... */ }
  export function helper(): void;
}

// 方式3：模块声明合并
// 原始模块声明
declare module 'my-module' {
  export function original(): void;
}

// 扩展模块声明
declare module 'my-module' {
  export function newFeature(): void;  // 合并到原模块
}
```

### 5.3 条件类型和高级特性
```typescript
// 使用条件类型
type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 映射类型
type ReadonlyProps<T> = {
  readonly [P in keyof T]: T[P];
};

// 工具类型声明
type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};
```

### 5.4 避免常见错误
```typescript
// ❌ 错误：在 .d.ts 中写实现
declare function add(x: number, y: number): number {
  return x + y;  // 错误：不能有函数体
}

// ✅ 正确
declare function add(x: number, y: number): number;

// ❌ 错误：重复声明
interface Config {
  timeout: number;
}
interface Config {  // 错误：重复接口
  timeout: string;  // 必须属性类型一致
}

// ✅ 正确：声明合并
interface Config {
  timeout: number;
}
interface Config {  // 正确：声明合并
  retry?: boolean;  // 添加新属性
}
```

## 6. **调试和测试**

### 测试声明文件
```typescript
// types.test-d.ts
import { expectType, expectError } from 'tsd';

// 测试类型
expectType<string>(window.myApp?.version);
expectError(window.nonExistent);  // 应该报错

// 测试函数参数
declare function greet(name: string): string;
expectType<string>(greet('Alice'));
expectError(greet(123));  // 应该报错：参数类型错误
```

## 7. **总结要点**

1. **`declare` 的作用**：告诉 TypeScript "这个存在"，但不实现
2. **`.d.ts` 文件**：纯类型声明文件，不包含实现
3. **使用场景**：
   - 为 JS 库添加类型
   - 声明环境变量
   - 扩展现有类型
   - 共享类型定义

4. **最佳实践**：
   - 保持声明简洁
   - 合理组织文件结构
   - 使用模块声明而不是全局声明
   - 为第三方库创建 `@types` 目录
   - 编写测试确保类型正确

5. **重要规则**：
   - `.d.ts` 文件只包含类型，不包含实现
   - 使用 `declare` 声明变量、函数、类
   - 接口和类型别名通常不需要 `declare`
   - 可以多次声明同一实体（声明合并）
