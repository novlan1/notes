package main

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

func main() {
	// 字符串字面量
	s1 := "Hello, 世界!"
	s2 := `这是一个
多行字符串
可以包含"引号"`

	fmt.Printf("字符串1: %s\n", s1)
	fmt.Printf("字符串2: %s\n", s2)

	// 字符串长度
	fmt.Printf("字节长度: %d\n", len(s1))
	fmt.Printf("字符长度: %d\n", utf8.RuneCountInString(s1))

	// 字符串操作
	fmt.Printf("包含'世界': %t\n", strings.Contains(s1, "世界"))
	fmt.Printf("以'Hello'开头: %t\n", strings.HasPrefix(s1, "Hello"))
	fmt.Printf("以'!'结尾: %t\n", strings.HasSuffix(s1, "!"))

	// 字符串拼接
	name := "张三"
	age := 25
	message := fmt.Sprintf("你好，我是%s，今年%d岁", name, age)
	fmt.Println(message)

	// 字符串分割
	text := "apple,banana,orange"
	fruits := strings.Split(text, ",")
	fmt.Printf("水果列表: %v\n", fruits)

	// 字符串替换
	replaced := strings.Replace(s1, "世界", "Go", 1)
	fmt.Printf("替换后: %s\n", replaced)
}
