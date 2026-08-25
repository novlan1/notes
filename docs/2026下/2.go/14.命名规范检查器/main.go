package main

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// 命名类型
type NameType int

const (
	VariableName NameType = iota
	FunctionName
	ConstantName
	PackageName
	InterfaceName
	StructName
)

// 命名规范检查器
type NamingChecker struct {
	// 编译时预编译正则表达式
	camelCaseRegex *regexp.Regexp
	snakeCaseRegex *regexp.Regexp
	constantRegex  *regexp.Regexp
	packageRegex   *regexp.Regexp
}

// 创建命名检查器
func NewNamingChecker() *NamingChecker {
	return &NamingChecker{
		camelCaseRegex: regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9]*$`),
		snakeCaseRegex: regexp.MustCompile(`^[a-z][a-z0-9]*(_[a-z0-9]+)*$`),
		constantRegex:  regexp.MustCompile(`^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$`),
		packageRegex:   regexp.MustCompile(`^[a-z][a-z0-9]*$`),
	}
}

// 检查结果
type CheckResult struct {
	Name        string
	Type        NameType
	IsValid     bool
	Issues      []string
	Suggestions []string
}

// 检查变量命名
func (nc *NamingChecker) CheckVariableName(name string) CheckResult {
	result := CheckResult{
		Name:        name,
		Type:        VariableName,
		IsValid:     true,
		Issues:      []string{},
		Suggestions: []string{},
	}

	// 检查是否为空
	if strings.TrimSpace(name) == "" {
		result.IsValid = false
		result.Issues = append(result.Issues, "变量名不能为空")
		return result
	}

	// 检查是否以数字开头
	if unicode.IsDigit(rune(name[0])) {
		result.IsValid = false
		result.Issues = append(result.Issues, "变量名不能以数字开头")
		result.Suggestions = append(result.Suggestions, "建议以字母开头")
	}

	// 检查是否包含特殊字符
	if !nc.camelCaseRegex.MatchString(name) {
		result.IsValid = false
		result.Issues = append(result.Issues, "变量名应使用驼峰命名法")
		result.Suggestions = append(result.Suggestions, nc.toCamelCase(name))
	}

	// 检查是否使用了下划线
	if strings.Contains(name, "_") {
		result.IsValid = false
		result.Issues = append(result.Issues, "变量名不应使用下划线")
		result.Suggestions = append(result.Suggestions, nc.snakeToCamel(name))
	}

	return result
}

// 检查函数命名
func (nc *NamingChecker) CheckFunctionName(name string) CheckResult {
	result := CheckResult{
		Name:        name,
		Type:        FunctionName,
		IsValid:     true,
		Issues:      []string{},
		Suggestions: []string{},
	}

	// 基本检查（与变量相同）
	varResult := nc.CheckVariableName(name)
	result.Issues = append(result.Issues, varResult.Issues...)
	result.Suggestions = append(result.Suggestions, varResult.Suggestions...)

	if !varResult.IsValid {
		result.IsValid = false
	}

	// 检查是否使用动词开头
	if result.IsValid && !nc.startsWithVerb(name) {
		result.Issues = append(result.Issues, "函数名建议使用动词开头")
		result.Suggestions = append(result.Suggestions, "考虑使用Get、Set、Create、Update、Delete等动词前缀")
	}

	return result
}

// 检查常量命名
func (nc *NamingChecker) CheckConstantName(name string) CheckResult {
	result := CheckResult{
		Name:        name,
		Type:        ConstantName,
		IsValid:     true,
		Issues:      []string{},
		Suggestions: []string{},
	}

	// 检查是否为空
	if strings.TrimSpace(name) == "" {
		result.IsValid = false
		result.Issues = append(result.Issues, "常量名不能为空")
		return result
	}

	// 检查是否使用全大写+下划线
	if !nc.constantRegex.MatchString(name) {
		result.IsValid = false
		result.Issues = append(result.Issues, "常量名应使用全大写字母和下划线")
		result.Suggestions = append(result.Suggestions, nc.toConstantCase(name))
	}

	return result
}

// 检查包命名
func (nc *NamingChecker) CheckPackageName(name string) CheckResult {
	result := CheckResult{
		Name:        name,
		Type:        PackageName,
		IsValid:     true,
		Issues:      []string{},
		Suggestions: []string{},
	}

	// 检查是否为空
	if strings.TrimSpace(name) == "" {
		result.IsValid = false
		result.Issues = append(result.Issues, "包名不能为空")
		return result
	}

	// 检查是否使用全小写
	if !nc.packageRegex.MatchString(name) {
		result.IsValid = false
		result.Issues = append(result.Issues, "包名应使用全小写字母")
		result.Suggestions = append(result.Suggestions, strings.ToLower(name))
	}

	// 检查是否过长
	if len(name) > 10 {
		result.Issues = append(result.Issues, "包名建议保持简短")
		result.Suggestions = append(result.Suggestions, "考虑使用更短的名称")
	}

	return result
}

// 辅助函数：转换为驼峰命名
func (nc *NamingChecker) toCamelCase(s string) string {
	words := strings.FieldsFunc(s, func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	})

	if len(words) == 0 {
		return s
	}

	result := strings.ToLower(words[0])
	for i := 1; i < len(words); i++ {
		if len(words[i]) > 0 {
			result += strings.ToUpper(words[i][:1]) + strings.ToLower(words[i][1:])
		}
	}

	return result
}

// 辅助函数：下划线转驼峰
func (nc *NamingChecker) snakeToCamel(s string) string {
	words := strings.Split(s, "_")
	if len(words) == 0 {
		return s
	}

	result := strings.ToLower(words[0])
	for i := 1; i < len(words); i++ {
		if len(words[i]) > 0 {
			result += strings.ToUpper(words[i][:1]) + strings.ToLower(words[i][1:])
		}
	}

	return result
}

// 辅助函数：转换为常量命名
func (nc *NamingChecker) toConstantCase(s string) string {
	// 处理驼峰命名
	var result strings.Builder
	for i, r := range s {
		if i > 0 && unicode.IsUpper(r) {
			result.WriteRune('_')
		}
		result.WriteRune(unicode.ToUpper(r))
	}
	return result.String()
}

// 辅助函数：检查是否以动词开头
func (nc *NamingChecker) startsWithVerb(name string) bool {
	verbs := []string{
		"get", "set", "create", "update", "delete", "add", "remove",
		"find", "search", "list", "count", "has", "is", "can", "should",
		"load", "save", "read", "write", "open", "close", "start", "stop",
		"run", "execute", "process", "handle", "manage", "build", "parse",
		"validate", "check", "verify", "calculate", "compute", "generate",
	}

	lowerName := strings.ToLower(name)
	for _, verb := range verbs {
		if strings.HasPrefix(lowerName, verb) {
			return true
		}
	}

	return false
}

// 批量检查
func (nc *NamingChecker) BatchCheck(names map[string]NameType) []CheckResult {
	results := make([]CheckResult, 0, len(names))

	for name, nameType := range names {
		var result CheckResult

		switch nameType {
		case VariableName:
			result = nc.CheckVariableName(name)
		case FunctionName:
			result = nc.CheckFunctionName(name)
		case ConstantName:
			result = nc.CheckConstantName(name)
		case PackageName:
			result = nc.CheckPackageName(name)
		default:
			result = nc.CheckVariableName(name) // 默认按变量处理
		}

		results = append(results, result)
	}

	return results
}

// 打印检查结果
func (result CheckResult) Print() {
	typeNames := map[NameType]string{
		VariableName:  "变量",
		FunctionName:  "函数",
		ConstantName:  "常量",
		PackageName:   "包",
		InterfaceName: "接口",
		StructName:    "结构体",
	}

	fmt.Printf("=== %s '%s' 检查结果 ===\n", typeNames[result.Type], result.Name)

	if result.IsValid {
		fmt.Printf("✅ 命名规范正确\n")
	} else {
		fmt.Printf("❌ 命名规范有问题\n")

		if len(result.Issues) > 0 {
			fmt.Println("问题:")
			for _, issue := range result.Issues {
				fmt.Printf("  - %s\n", issue)
			}
		}

		if len(result.Suggestions) > 0 {
			fmt.Println("建议:")
			for _, suggestion := range result.Suggestions {
				fmt.Printf("  - %s\n", suggestion)
			}
		}
	}

	fmt.Println()
}

func main() {
	checker := NewNamingChecker()

	// 单个检查示例
	fmt.Println("=== 单个检查示例 ===")

	// 变量检查
	varResult := checker.CheckVariableName("user_name")
	varResult.Print()

	// 函数检查
	funcResult := checker.CheckFunctionName("UserData")
	funcResult.Print()

	// 常量检查
	constResult := checker.CheckConstantName("maxSize")
	constResult.Print()

	// 包检查
	pkgResult := checker.CheckPackageName("MyPackage")
	pkgResult.Print()

	// 批量检查示例
	fmt.Println("=== 批量检查示例 ===")

	testCases := map[string]NameType{
		"userName":            VariableName,
		"user_name":           VariableName,
		"UserName":            VariableName,
		"123name":             VariableName,
		"getUserName":         FunctionName,
		"get_user":            FunctionName,
		"UserData":            FunctionName,
		"processData":         FunctionName,
		"MAX_SIZE":            ConstantName,
		"maxSize":             ConstantName,
		"Max_Size":            ConstantName,
		"mypackage":           PackageName,
		"MyPackage":           PackageName,
		"my_package":          PackageName,
		"verylongpackagename": PackageName,
	}

	results := checker.BatchCheck(testCases)

	validCount := 0
	for _, result := range results {
		result.Print()
		if result.IsValid {
			validCount++
		}
	}

	fmt.Printf("=== 统计结果 ===\n")
	fmt.Printf("总计: %d 个命名\n", len(results))
	fmt.Printf("正确: %d 个\n", validCount)
	fmt.Printf("错误: %d 个\n", len(results)-validCount)
	fmt.Printf("正确率: %.1f%%\n", float64(validCount)/float64(len(results))*100)

	fmt.Println(strconv.Itoa(0), "" == strconv.Itoa(0))
}
