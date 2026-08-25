// cd docs/2026下/2.go/3.custom-module
// go mod init custom-module
// go run .

package main

import (
	"fmt"

	"custom-module/calculator"
	_ "math"
)

const (
	PI      = 3.14
	COMPANY = "公司"
	G       = 1 + 2
	// F       = math.Sin(math.Pi)
)

const (
	Monday = 0
	Tuesday
	Wes
)

func main() {
	fmt.Printf("圆的面积%.2f\n", calculator.CircleArea(5.0))

	fmt.Println(PI)
	fmt.Println(G)

	// fmt.Println(_.Sin(_.Pi))

	fmt.Println(Monday)
	fmt.Println(Tuesday)
}
