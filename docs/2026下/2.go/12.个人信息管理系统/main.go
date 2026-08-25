package main

import (
	"fmt"
	"regexp"

	// "strconv"
	"strings"
)

// 用户信息结构
type PersonInfo struct {
	Name     string
	Age      int
	Email    string
	Phone    string
	IsActive bool
}

// 验证邮箱格式
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// 验证电话号码格式
func isValidPhone(phone string) bool {
	phoneRegex := regexp.MustCompile(`^1[3-9]\d{9}$`)
	return phoneRegex.MatchString(phone)
}

// 验证年龄
func isValidAge(age int) bool {
	return age > 0 && age < 150
}

// 创建用户信息
func createPersonInfo(name, email, phone string, age int) (*PersonInfo, error) {
	if strings.TrimSpace(name) == "" {
		return nil, fmt.Errorf("姓名不能为空")
	}

	if !isValidAge(age) {
		return nil, fmt.Errorf("年龄必须在1-149之间")
	}

	if !isValidEmail(email) {
		return nil, fmt.Errorf("邮箱格式不正确")
	}

	if !isValidPhone(phone) {
		return nil, fmt.Errorf("电话号码格式不正确")
	}

	return &PersonInfo{
		Name:     name,
		Age:      age,
		Email:    email,
		Phone:    phone,
		IsActive: true,
	}, nil
}

// 显示用户信息
func (p *PersonInfo) Display() {
	fmt.Println("=== 个人信息 ===")
	fmt.Printf("姓名: %s\n", p.Name)
	fmt.Printf("年龄: %d\n", p.Age)
	fmt.Printf("邮箱: %s\n", p.Email)
	fmt.Printf("电话: %s\n", p.Phone)
	fmt.Printf("状态: %s\n", map[bool]string{true: "活跃", false: "非活跃"}[p.IsActive])
}

// 更新年龄
func (p *PersonInfo) UpdateAge(newAge int) error {
	if !isValidAge(newAge) {
		return fmt.Errorf("年龄必须在1-149之间")
	}
	p.Age = newAge
	return nil
}

func main() {
	// 创建用户信息
	person, err := createPersonInfo("张三", "zhangsan@example.com", "13812345678", 25)
	if err != nil {
		fmt.Printf("创建用户信息失败: %v\n", err)
		return
	}

	// 显示用户信息
	person.Display()

	// 更新年龄
	fmt.Println("\n更新年龄...")
	err = person.UpdateAge(26)
	if err != nil {
		fmt.Printf("更新年龄失败: %v\n", err)
	} else {
		fmt.Printf("年龄更新成功，新年龄: %d\n", person.Age)
	}

	// 测试无效数据
	fmt.Println("\n测试无效数据:")
	invalidCases := []struct {
		name, email, phone string
		age                int
	}{
		{"", "test@example.com", "13812345678", 25},
		{"李四", "invalid-email", "13812345678", 25},
		{"王五", "test@example.com", "12345", 25},
		{"赵六", "test@example.com", "13812345678", 200},
	}

	for i, testCase := range invalidCases {
		_, err := createPersonInfo(testCase.name, testCase.email, testCase.phone, testCase.age)
		if err != nil {
			fmt.Printf("测试案例 %d: %v\n", i+1, err)
		}
	}
}
