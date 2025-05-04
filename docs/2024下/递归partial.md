```ts
interface Address {
  street: string;
  city: string;
  zipcode: string;
}

interface User {
  id: number;
  name: string;
  address: Address;
}

// 递归地将所有嵌套属性变为可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const user: DeepPartial<User> = {
  id: 1,
  address: {
    city: "西安",
  },
};
```