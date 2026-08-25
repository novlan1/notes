package main

import "fmt"

func main() {
	var value interface{} = "Hello, World!"

	// 类型断言
	str, ok := value.(string)
	if ok {
		fmt.Printf("值是字符串: %s\n", str)
	} else {
		fmt.Println("值不是字符串")
	}

	// 不安全的类型断言（如果类型不匹配会panic）
	// str2 := value.(int)
	// fmt.Println(str2)

	// 类型选择
	switch v := value.(type) {
	case string:
		fmt.Printf("字符串: %s\n", v)
	case int:
		fmt.Printf("整数: %d\n", v)
	case float64:
		fmt.Printf("浮点数: %.2f\n", v)
	default:
		fmt.Printf("未知类型: %T\n", v)
	}
}
