package main

import (
	"fmt"
	"unsafe"
)

func main() {
	// 有符号整数
	var i8 int8 = 127     // -128 到 127
	var i16 int16 = 32767 // -32768 到 32767
	var i32 int32 = 2147483647
	var i64 int64 = 9223372036854775807

	// 无符号整数
	var ui8 uint8 = 255     // 0 到 255
	var ui16 uint16 = 65535 // 0 到 65535
	var ui32 uint32 = 4294967295
	var ui64 uint64 = 18446744073709551615

	// 平台相关的整数类型
	var i int = 100   // 32位系统上是int32，64位系统上是int64
	var ui uint = 100 // 32位系统上是uint32，64位系统上是uint64

	fmt.Printf("int8: %d, 大小: %d bytes\n", i8, unsafe.Sizeof(i8))
	fmt.Printf("int16: %d, 大小: %d bytes\n", i16, unsafe.Sizeof(i16))
	fmt.Printf("int32: %d, 大小: %d bytes\n", i32, unsafe.Sizeof(i32))
	fmt.Printf("int64: %d, 大小: %d bytes\n", i64, unsafe.Sizeof(i64))

	fmt.Printf("uint8: %d, 大小: %d bytes\n", ui8, unsafe.Sizeof(ui8))
	fmt.Printf("uint16: %d, 大小: %d bytes\n", ui16, unsafe.Sizeof(ui16))
	fmt.Printf("uint32: %d, 大小: %d bytes\n", ui32, unsafe.Sizeof(ui32))
	fmt.Printf("uint64: %d, 大小: %d bytes\n", ui64, unsafe.Sizeof(ui64))

	fmt.Printf("int: %d, 大小: %d bytes\n", i, unsafe.Sizeof(i))
	fmt.Printf("uint: %d, 大小: %d bytes\n", ui, unsafe.Sizeof(ui))
}
