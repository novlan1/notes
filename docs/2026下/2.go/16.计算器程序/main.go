package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// 简单计算器
type Calculator struct {
	precision int // 小数精度
}

// 创建计算器
func NewCalculator() *Calculator {
	return &Calculator{precision: 2}
}

// 基本四则运算
func (c *Calculator) Add(a, b float64) float64 {
	return a + b
}

func (c *Calculator) Subtract(a, b float64) float64 {
	return a - b
}

func (c *Calculator) Multiply(a, b float64) float64 {
	return a * b
}

func (c *Calculator) Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("除数不能为零")
	}
	return a / b, nil
}

// 高级运算
func (c *Calculator) Power(base, exp float64) float64 {
	return math.Pow(base, exp)
}

func (c *Calculator) SquareRoot(x float64) (float64, error) {
	if x < 0 {
		return 0, fmt.Errorf("负数无法开平方根")
	}
	return math.Sqrt(x), nil
}

func (c *Calculator) Percentage(value, total float64) (float64, error) {
	if total == 0 {
		return 0, fmt.Errorf("总数不能为零")
	}
	return (value / total) * 100, nil
}

// 格式化结果
func (c *Calculator) FormatResult(result float64) string {
	format := fmt.Sprintf("%%.%df", c.precision)
	return fmt.Sprintf(format, result)
}

// 计算表达式（简单版本，只支持两个操作数）
func (c *Calculator) Calculate(a, b float64, operator string) (string, error) {
	var result float64
	var err error

	switch operator {
	case "+":
		result = c.Add(a, b)
	case "-":
		result = c.Subtract(a, b)
	case "*":
		result = c.Multiply(a, b)
	case "/":
		result, err = c.Divide(a, b)
		if err != nil {
			return "", err
		}
	case "^", "**":
		result = c.Power(a, b)
	case "%":
		result, err = c.Percentage(a, b)
		if err != nil {
			return "", err
		}
	default:
		return "", fmt.Errorf("不支持的运算符: %s", operator)
	}

	return c.FormatResult(result), nil
}

// 批量计算
func (c *Calculator) BatchCalculate(expressions []string) {
	fmt.Println("=== 编程导航计算器 ===")

	for i, expr := range expressions {
		fmt.Printf("表达式 %d: %s\n", i+1, expr)

		// 简单解析表达式 (a operator b)
		parts := strings.Fields(expr)
		if len(parts) != 3 {
			fmt.Printf("  错误: 表达式格式不正确\n\n")
			continue
		}

		a, err1 := strconv.ParseFloat(parts[0], 64)
		operator := parts[1]
		b, err2 := strconv.ParseFloat(parts[2], 64)

		if err1 != nil || err2 != nil {
			fmt.Printf("  错误: 无法解析数字\n\n")
			continue
		}

		result, err := c.Calculate(a, b, operator)
		if err != nil {
			fmt.Printf("  错误: %v\n\n", err)
		} else {
			fmt.Printf("  结果: %s\n\n", result)
		}
	}
}

func main() {
	calc := NewCalculator()

	// 基本运算演示
	fmt.Println("=== 基本运算演示 ===")

	fmt.Printf("10 + 5 = %s\n", calc.FormatResult(calc.Add(10, 5)))
	fmt.Printf("10 - 5 = %s\n", calc.FormatResult(calc.Subtract(10, 5)))
	fmt.Printf("10 * 5 = %s\n", calc.FormatResult(calc.Multiply(10, 5)))

	if result, err := calc.Divide(10, 5); err != nil {
		fmt.Printf("10 / 5 = 错误: %v\n", err)
	} else {
		fmt.Printf("10 / 5 = %s\n", calc.FormatResult(result))
	}

	// 高级运算演示
	fmt.Println("\n=== 高级运算演示 ===")

	fmt.Printf("2^3 = %s\n", calc.FormatResult(calc.Power(2, 3)))

	if result, err := calc.SquareRoot(16); err != nil {
		fmt.Printf("√16 = 错误: %v\n", err)
	} else {
		fmt.Printf("√16 = %s\n", calc.FormatResult(result))
	}

	if result, err := calc.Percentage(85, 100); err != nil {
		fmt.Printf("85/100的百分比 = 错误: %v\n", err)
	} else {
		fmt.Printf("85/100的百分比 = %s%%\n", calc.FormatResult(result))
	}

	// 错误处理演示
	fmt.Println("\n=== 错误处理演示 ===")

	if _, err := calc.Divide(10, 0); err != nil {
		fmt.Printf("除零错误: %v\n", err)
	}

	if _, err := calc.SquareRoot(-4); err != nil {
		fmt.Printf("负数开方错误: %v\n", err)
	}

	// 批量计算
	fmt.Println()

	expressions := []string{
		"100 + 50",
		"200 - 75",
		"15 * 4",
		"120 / 8",
		"2 ^ 10",
		"90 % 100",
		"100 / 0",   // 错误示例
		"abc + 123", // 错误示例
	}

	calc.BatchCalculate(expressions)
}
