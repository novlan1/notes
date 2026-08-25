package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"unsafe"
)

// 模拟不同类型的用户数据
type UserProfile struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

type CompanyInfo struct {
	Name     string `json:"company_name"`
	Industry string `json:"industry"`
}

func processUserData(data interface{}) {
	switch v := data.(type) {
	case UserProfile:
		fmt.Printf("处理个人用户: %s，年龄 %d\n", v.Name, v.Age)
		if v.Age >= 18 {
			fmt.Println("可以注册编程导航完整账户")
		} else {
			fmt.Println("可以注册编程导航学生账户")
		}

	case CompanyInfo:
		fmt.Printf("处理企业用户: %s，行业 %s\n", v.Name, v.Industry)
		if v.Industry == "IT" || v.Industry == "科技" {
			fmt.Println("推荐企业版编程导航服务")
		} else {
			fmt.Println("推荐基础版编程培训服务")
		}

	case string:
		fmt.Printf("处理原始字符串数据: %s\n", v)
		// 尝试解析 JSON
		var profile UserProfile
		if err := json.Unmarshal([]byte(v), &profile); err == nil {
			fmt.Println("成功解析为用户档案")
			processUserData(profile)
		} else {
			fmt.Println("无法解析的字符串数据")
		}

	case []interface{}:
		fmt.Printf("处理数据数组，包含 %d 个元素\n", len(v))
		for i, item := range v {
			fmt.Printf("  元素 %d: ", i+1)
			processUserData(item)
		}

	case nil:
		fmt.Println("数据为空")

	default:
		fmt.Printf("未支持的数据类型: %T\n", v)
	}
}

func main() {
	// 测试不同类型的数据
	user1 := UserProfile{Name: "张三", Age: 25}
	company1 := CompanyInfo{Name: "编程导航科技", Industry: "IT"}
	jsonStr := `{"name": "李四", "age": 30}`

	fmt.Println("=== 数据处理测试 ===")
	processUserData(user1)
	fmt.Println()

	processUserData(company1)
	fmt.Println()

	processUserData(jsonStr)
	fmt.Println()

	processUserData([]interface{}{user1, company1})
	fmt.Println()

	processUserData(nil)

	abc := 10
	fmt.Println(reflect.TypeOf(abc), unsafe.Sizeof(abc), reflect.TypeOf(abc).Size())
}
