package main

import (
	"fmt"
	"strconv"
	"strings"
)

// 类型转换器
type TypeConverter struct{}

// 字符串转整数
func (tc *TypeConverter) StringToInt(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("空字符串无法转换为整数")
	}

	result, err := strconv.Atoi(s)
	if err != nil {
		return 0, fmt.Errorf("'%s' 无法转换为整数: %v", s, err)
	}

	return result, nil
}

// 字符串转浮点数
func (tc *TypeConverter) StringToFloat(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0.0, fmt.Errorf("空字符串无法转换为浮点数")
	}

	result, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0.0, fmt.Errorf("'%s' 无法转换为浮点数: %v", s, err)
	}

	return result, nil
}

// 字符串转布尔值
func (tc *TypeConverter) StringToBool(s string) (bool, error) {
	s = strings.TrimSpace(strings.ToLower(s))
	if s == "" {
		return false, fmt.Errorf("空字符串无法转换为布尔值")
	}

	switch s {
	case "true", "1", "yes", "on", "是":
		return true, nil
	case "false", "0", "no", "off", "否":
		return false, nil
	default:
		return false, fmt.Errorf("'%s' 无法转换为布尔值", s)
	}
}

// 数字转字符串
func (tc *TypeConverter) NumberToString(num interface{}) string {
	switch v := num.(type) {
	case int:
		return strconv.Itoa(v)
	case int8:
		return strconv.FormatInt(int64(v), 10)
	case int16:
		return strconv.FormatInt(int64(v), 10)
	case int32:
		return strconv.FormatInt(int64(v), 10)
	case int64:
		return strconv.FormatInt(v, 10)
	case uint:
		return strconv.FormatUint(uint64(v), 10)
	case uint8:
		return strconv.FormatUint(uint64(v), 10)
	case uint16:
		return strconv.FormatUint(uint64(v), 10)
	case uint32:
		return strconv.FormatUint(uint64(v), 10)
	case uint64:
		return strconv.FormatUint(v, 10)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		return fmt.Sprintf("%v", num)
	}
}

// 检查字符串是否为数字
func (tc *TypeConverter) IsNumeric(s string) bool {
	_, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	return err == nil
}

// 安全转换（带默认值）
func (tc *TypeConverter) StringToIntWithDefault(s string, defaultValue int) int {
	result, err := tc.StringToInt(s)
	if err != nil {
		return defaultValue
	}
	return result
}

func (tc *TypeConverter) StringToFloatWithDefault(s string, defaultValue float64) float64 {
	result, err := tc.StringToFloat(s)
	if err != nil {
		return defaultValue
	}
	return result
}

func main() {
	converter := &TypeConverter{}

	// 测试字符串转数字
	fmt.Println("=== 字符串转数字测试 ===")

	intTests := []string{"123", "456", "invalid", "", "  789  "}
	for _, test := range intTests {
		result, err := converter.StringToInt(test)
		if err != nil {
			fmt.Printf("'%s' -> 整数: 错误 - %v\n", test, err)
		} else {
			fmt.Printf("'%s' -> 整数: %d\n", test, result)
		}
	}

	// 测试字符串转浮点数
	fmt.Println("\n=== 字符串转浮点数测试 ===")

	floatTests := []string{"3.14", "2.71828", "invalid", "", "  1.618  "}
	for _, test := range floatTests {
		result, err := converter.StringToFloat(test)
		if err != nil {
			fmt.Printf("'%s' -> 浮点数: 错误 - %v\n", test, err)
		} else {
			fmt.Printf("'%s' -> 浮点数: %.5f\n", test, result)
		}
	}

	// 测试字符串转布尔值
	fmt.Println("\n=== 字符串转布尔值测试 ===")

	boolTests := []string{"true", "false", "1", "0", "yes", "no", "是", "否", "invalid"}
	for _, test := range boolTests {
		result, err := converter.StringToBool(test)
		if err != nil {
			fmt.Printf("'%s' -> 布尔值: 错误 - %v\n", test, err)
		} else {
			fmt.Printf("'%s' -> 布尔值: %t\n", test, result)
		}
	}

	// 测试数字转字符串
	fmt.Println("\n=== 数字转字符串测试 ===")

	numbers := []interface{}{
		int(123),
		int8(127),
		int16(32767),
		int32(2147483647),
		int64(9223372036854775807),
		uint(456),
		uint8(255),
		uint16(65535),
		uint32(4294967295),
		uint64(18446744073709551615),
		float32(3.14159),
		float64(2.718281828459045),
	}

	for _, num := range numbers {
		result := converter.NumberToString(num)
		fmt.Printf("%v (%T) -> 字符串: '%s'\n", num, num, result)
	}

	// 测试数字检查
	fmt.Println("\n=== 数字检查测试 ===")

	checkTests := []string{"123", "3.14", "invalid", "", "  456  ", "1.23e4"}
	for _, test := range checkTests {
		isNumeric := converter.IsNumeric(test)
		fmt.Printf("'%s' 是数字: %t\n", test, isNumeric)
	}

	// 测试安全转换
	fmt.Println("\n=== 安全转换测试 ===")

	safeTests := []string{"123", "invalid", "", "456.789"}
	for _, test := range safeTests {
		intResult := converter.StringToIntWithDefault(test, -1)
		floatResult := converter.StringToFloatWithDefault(test, -1.0)
		fmt.Printf("'%s' -> 安全整数: %d, 安全浮点数: %.3f\n", test, intResult, floatResult)
	}
}
