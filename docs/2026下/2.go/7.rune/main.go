package main

import "fmt"

func main() {
	// byte 类型（uint8 的别名）
	var b byte = 'A'
	fmt.Printf("byte: %c, 数值: %d\n", b, b)

	// rune 类型（int32 的别名），用于表示 Unicode 字符
	var r rune = '中'
	fmt.Printf("rune: %c, 数值: %d\n", r, r)

	// 字符串遍历
	s := "Hello, 世界!"

	// 按字节遍历
	fmt.Print("按字节遍历: ")
	for i := 0; i < len(s); i++ {
		fmt.Printf("%c ", s[i])
	}
	fmt.Println()

	// 按字符遍历
	fmt.Print("按字符遍历: ")
	for _, r := range s {
		fmt.Printf("%c ", r)
	}
	fmt.Println()

	// 字符转换
	fmt.Printf("'A' + 1 = %c\n", 'A'+1)
	fmt.Printf("'a' - 'A' = %d\n", 'a'-'A')
}
