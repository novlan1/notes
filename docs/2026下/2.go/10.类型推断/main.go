package main

import "fmt"

func main() {
	// 编译器会自动推断类型
	name := "张三"      // string
	age := 25         // int
	height := 1.75    // float64
	isStudent := true // bool

	fmt.Printf("name: %s, 类型: %T\n", name, name)
	fmt.Printf("age: %d, 类型: %T\n", age, age)
	fmt.Printf("height: %.2f, 类型: %T\n", height, height)
	fmt.Printf("isStudent: %t, 类型: %T\n", isStudent, isStudent)

	// 复杂类型推断
	numbers := []int{1, 2, 3, 4, 5}
	fmt.Printf("numbers: %v, 类型: %T\n", numbers, numbers)

	person := map[string]interface{}{
		"name": "李四",
		"age":  30,
	}
	fmt.Printf("person: %v, 类型: %T\n", person, person)

	// 函数返回值的类型推断
	result := add(10, 20)
	fmt.Printf("result: %d, 类型: %T\n", result, result)
}

func add(a, b int) int {
	return a + b
}
