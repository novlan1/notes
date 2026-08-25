package main

import (
	"fmt"
	"strconv"
)

func main() {
	// 数值类型转换
	var i int = 42
	var f float64 = float64(i)
	var ui uint = uint(i)

	fmt.Printf("int: %d\n", i)
	fmt.Printf("float64: %.2f\n", f)
	fmt.Printf("uint: %d\n", ui)

	// 注意：浮点数转整数会截断小数部分
	var pi float64 = 3.14159
	var iPi int = int(pi)
	fmt.Printf("pi: %.5f, int(pi): %d\n", pi, iPi)

	// 字符串和数字之间的转换

	// 数字转字符串
	num := 123
	str := strconv.Itoa(num)
	fmt.Printf("数字 %d 转换为字符串: '%s'\n", num, str)

	// 字符串转数字
	str2 := "456"
	num2, err := strconv.Atoi(str2)
	if err != nil {
		fmt.Printf("转换失败: %v\n", err)
	} else {
		fmt.Printf("字符串 '%s' 转换为数字: %d\n", str2, num2)
	}

	// 更复杂的转换
	floatStr := "3.14159"
	floatNum, err := strconv.ParseFloat(floatStr, 64)
	if err != nil {
		fmt.Printf("转换失败: %v\n", err)
	} else {
		fmt.Printf("字符串 '%s' 转换为浮点数: %.5f\n", floatStr, floatNum)
	}

	// 布尔值转换
	boolStr := "true"
	boolVal, err := strconv.ParseBool(boolStr)
	if err != nil {
		fmt.Printf("转换失败: %v\n", err)
	} else {
		fmt.Printf("字符串 '%s' 转换为布尔值: %t\n", boolStr, boolVal)
	}
}
