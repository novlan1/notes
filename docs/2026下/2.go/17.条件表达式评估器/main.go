package main

import (
	"fmt"
	"strings"
)

// 用户信息
type User struct {
	ID          int
	Name        string
	Age         int
	Level       string // "free", "premium", "enterprise"
	Score       float64
	IsActive    bool
	DeviceCount int
}

// 条件评估器
type ConditionEvaluator struct {
	user *User
}

// 创建评估器
func NewConditionEvaluator(user *User) *ConditionEvaluator {
	return &ConditionEvaluator{user: user}
}

// 评估结果
type EvaluationResult struct {
	Condition   string
	Result      bool
	Explanation string
}

// 基本条件检查
func (ce *ConditionEvaluator) checkAge(minAge int) EvaluationResult {
	result := ce.user.Age >= minAge
	return EvaluationResult{
		Condition:   fmt.Sprintf("年龄 >= %d", minAge),
		Result:      result,
		Explanation: fmt.Sprintf("用户年龄 %d %s %d", ce.user.Age, map[bool]string{true: ">=", false: "<"}[result], minAge),
	}
}

func (ce *ConditionEvaluator) checkLevel(requiredLevel string) EvaluationResult {
	levelPriority := map[string]int{
		"free":       1,
		"premium":    2,
		"enterprise": 3,
	}

	userPriority := levelPriority[ce.user.Level]
	requiredPriority := levelPriority[requiredLevel]
	result := userPriority >= requiredPriority

	return EvaluationResult{
		Condition: fmt.Sprintf("用户级别 >= %s", requiredLevel),
		Result:    result,
		Explanation: fmt.Sprintf("用户级别 %s (优先级:%d) %s %s (优先级:%d)",
			ce.user.Level, userPriority,
			map[bool]string{true: ">=", false: "<"}[result],
			requiredLevel, requiredPriority),
	}
}

func (ce *ConditionEvaluator) checkScore(minScore float64) EvaluationResult {
	result := ce.user.Score >= minScore
	return EvaluationResult{
		Condition:   fmt.Sprintf("评分 >= %.1f", minScore),
		Result:      result,
		Explanation: fmt.Sprintf("用户评分 %.1f %s %.1f", ce.user.Score, map[bool]string{true: ">=", false: "<"}[result], minScore),
	}
}

func (ce *ConditionEvaluator) checkActive() EvaluationResult {
	return EvaluationResult{
		Condition:   "账户激活",
		Result:      ce.user.IsActive,
		Explanation: fmt.Sprintf("用户账户状态: %s", map[bool]string{true: "已激活", false: "未激活"}[ce.user.IsActive]),
	}
}

func (ce *ConditionEvaluator) checkDeviceLimit(maxDevices int) EvaluationResult {
	result := ce.user.DeviceCount <= maxDevices
	return EvaluationResult{
		Condition:   fmt.Sprintf("设备数量 <= %d", maxDevices),
		Result:      result,
		Explanation: fmt.Sprintf("用户设备数量 %d %s %d", ce.user.DeviceCount, map[bool]string{true: "<=", false: ">"}[result], maxDevices),
	}
}

// 复杂条件评估
func (ce *ConditionEvaluator) EvaluateFeatureAccess(featureName string) {
	fmt.Printf("=== %s功能访问权限评估 ===\n", featureName)
	fmt.Printf("用户信息: %s (ID:%d, 年龄:%d, 级别:%s, 评分:%.1f, 激活:%t, 设备:%d)\n\n",
		ce.user.Name, ce.user.ID, ce.user.Age, ce.user.Level,
		ce.user.Score, ce.user.IsActive, ce.user.DeviceCount)

	var conditions []EvaluationResult
	var finalResult bool
	var logic string

	switch featureName {
	case "面试鸭高级题库":
		// 条件: (付费用户 OR 评分>=90) AND 年龄>=18 AND 账户激活
		c1 := ce.checkLevel("premium")
		c2 := ce.checkScore(90.0)
		c3 := ce.checkAge(18)
		c4 := ce.checkActive()

		conditions = []EvaluationResult{c1, c2, c3, c4}
		finalResult = (c1.Result || c2.Result) && c3.Result && c4.Result
		logic = "(付费用户 OR 评分>=90) AND 年龄>=18 AND 账户激活"

	case "编程导航项目下载":
		// 条件: 付费用户 AND 账户激活 AND 设备数量<=5
		c1 := ce.checkLevel("premium")
		c2 := ce.checkActive()
		c3 := ce.checkDeviceLimit(5)

		conditions = []EvaluationResult{c1, c2, c3}
		finalResult = c1.Result && c2.Result && c3.Result
		logic = "付费用户 AND 账户激活 AND 设备数量<=5"

	case "算法导航VIP内容":
		// 条件: (企业用户 OR (付费用户 AND 评分>=85)) AND 账户激活
		c1 := ce.checkLevel("enterprise")
		c2 := ce.checkLevel("premium")
		c3 := ce.checkScore(85.0)
		c4 := ce.checkActive()

		conditions = []EvaluationResult{c1, c2, c3, c4}
		finalResult = (c1.Result || (c2.Result && c3.Result)) && c4.Result
		logic = "(企业用户 OR (付费用户 AND 评分>=85)) AND 账户激活"

	case "老鱼简历模板下载":
		// 条件: 年龄>=16 AND (付费用户 OR 评分>=95) AND 账户激活
		c1 := ce.checkAge(16)
		c2 := ce.checkLevel("premium")
		c3 := ce.checkScore(95.0)
		c4 := ce.checkActive()

		conditions = []EvaluationResult{c1, c2, c3, c4}
		finalResult = c1.Result && (c2.Result || c3.Result) && c4.Result
		logic = "年龄>=16 AND (付费用户 OR 评分>=95) AND 账户激活"

	default:
		fmt.Println("未知功能")
		return
	}

	// 显示每个条件的评估结果
	fmt.Println("条件评估:")
	for i, condition := range conditions {
		status := "❌"
		if condition.Result {
			status = "✅"
		}
		fmt.Printf("%d. %s %s\n   %s\n", i+1, status, condition.Condition, condition.Explanation)
	}

	// 显示逻辑组合和最终结果
	fmt.Printf("\n逻辑组合: %s\n", logic)

	if finalResult {
		fmt.Printf("✅ 最终结果: 允许访问 %s\n", featureName)
	} else {
		fmt.Printf("❌ 最终结果: 拒绝访问 %s\n", featureName)
	}
	fmt.Println()
}

func main() {
	// 测试用户数据
	users := []*User{
		{
			ID: 1001, Name: "张三", Age: 22, Level: "premium",
			Score: 88.5, IsActive: true, DeviceCount: 3,
		},
		{
			ID: 1002, Name: "李四", Age: 17, Level: "free",
			Score: 95.0, IsActive: true, DeviceCount: 1,
		},
		{
			ID: 1003, Name: "王五", Age: 25, Level: "enterprise",
			Score: 92.0, IsActive: false, DeviceCount: 8,
		},
		{
			ID: 1004, Name: "赵六", Age: 19, Level: "free",
			Score: 78.0, IsActive: true, DeviceCount: 2,
		},
	}

	features := []string{
		"面试鸭高级题库",
		"编程导航项目下载",
		"算法导航VIP内容",
		"老鱼简历模板下载",
	}

	// 对每个用户评估所有功能的访问权限
	for _, user := range users {
		evaluator := NewConditionEvaluator(user)

		for _, feature := range features {
			evaluator.EvaluateFeatureAccess(feature)
		}

		fmt.Println(strings.Repeat("=", 60))
	}
}
