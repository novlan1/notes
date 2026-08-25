package main

import "fmt"

func main() {
	fmt.Println("=== 位运算技巧 ===")

	// 1. 快速计算2的幂
	fmt.Println("2的幂计算:")
	for i := 0; i < 10; i++ {
		power := 1 << i
		fmt.Printf("2^%d = %d\n", i, power)
	}

	// 2. 判断奇偶数
	fmt.Println("\n奇偶数判断:")
	numbers := []int{1, 2, 3, 4, 5, 10, 15, 100}
	for _, num := range numbers {
		isOdd := (num & 1) == 1
		fmt.Printf("%d 是奇数: %t\n", num, isOdd)
	}

	// 3. 交换两个数(不使用临时变量)
	fmt.Println("\n异或交换:")
	x, y := 10, 20
	fmt.Printf("交换前: x=%d, y=%d\n", x, y)

	x = x ^ y
	y = x ^ y
	x = x ^ y

	fmt.Printf("交换后: x=%d, y=%d\n", x, y)

	// 4. 清除最右边的1
	fmt.Println("\n清除最右边的1:")
	testNum := 12 // 二进制: 1100
	fmt.Printf("原数: %d (二进制: %04b)\n", testNum, testNum)

	cleared := testNum & (testNum - 1)
	fmt.Printf("清除后: %d (二进制: %04b)\n", cleared, cleared)

	// 5. 计算二进制中1的个数
	fmt.Println("\n计算1的个数:")
	countNum := 15 // 二进制: 1111
	count := 0
	temp := countNum

	for temp != 0 {
		count++
		temp = temp & (temp - 1) // 每次清除最右边的1
	}

	fmt.Printf("%d (二进制: %04b) 中1的个数: %d\n", countNum, countNum, count)
}
