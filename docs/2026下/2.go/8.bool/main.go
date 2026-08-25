package main

import "fmt"

func main() {
	var isTrue bool = true
	var isFalse bool = false
	var isDefault bool // 默认值是 false

	fmt.Printf("isTrue: %t\n", isTrue)
	fmt.Printf("isFalse: %t\n", isFalse)
	fmt.Printf("isDefault: %t\n", isDefault)

	// 布尔运算
	fmt.Printf("true && false = %t\n", true && false)
	fmt.Printf("true || false = %t\n", true || false)
	fmt.Printf("!true = %t\n", !true)

	// 比较操作返回布尔值
	a, b := 10, 20
	fmt.Printf("%d > %d: %t\n", a, b, a > b)
	fmt.Printf("%d < %d: %t\n", a, b, a < b)
	fmt.Printf("%d == %d: %t\n", a, b, a == b)
	fmt.Printf("%d != %d: %t\n", a, b, a != b)
}
