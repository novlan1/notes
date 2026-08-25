package main

import (
	"fmt"
	"math"
)

func main() {
	var f32 float32 = 3.14159
	var f64 float64 = 3.141592653589793

	fmt.Printf("float32: %.6f\n", f32)
	fmt.Printf("float64: %.15f\n", f64)

	// 浮点数的特殊值
	fmt.Printf("正无穷: %f\n", math.Inf(1))
	fmt.Printf("负无穷: %f\n", math.Inf(-1))
	fmt.Printf("NaN: %f\n", math.NaN())

	// 浮点数比较需要注意精度问题
	a := 0.1 + 0.2
	b := 0.3
	fmt.Printf("0.1 + 0.2 = %.17f\n", a)
	fmt.Printf("0.3 = %.17f\n", b)
	fmt.Printf("相等吗? %t\n", a == b)

	// 正确的浮点数比较方法
	epsilon := 1e-9
	fmt.Printf("近似相等吗? %t\n", math.Abs(a-b) < epsilon)
}
