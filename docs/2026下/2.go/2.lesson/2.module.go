package main

import (
	"fmt"
	_ "image/png"
	m "math"
	"math/rand"
	. "strings"
)

func main() {
	fmt.Printf("正弦值：%.2f\n", m.Sin(m.Pi/2))

	fmt.Println("转为大些: ", ToUpper("hello"))

	fmt.Printf("随机数: %d\n", rand.Intn(100))
}
