package main

import (
	"fmt"
)

// 权限常量定义
const (
	// 基础权限 (0-7位)
	PermRead    uint64 = 1 << iota // 0001
	PermWrite                      // 0010
	PermExecute                    // 0100
	PermDelete                     // 1000

	// 用户管理权限 (8-15位)
	PermUserView = 1 << (8 + iota - 4)
	PermUserCreate
	PermUserUpdate
	PermUserDelete

	// 内容管理权限 (16-23位)
	PermContentView = 1 << (16 + iota - 8)
	PermContentCreate
	PermContentUpdate
	PermContentDelete

	// 系统管理权限 (24-31位)
	PermSystemConfig = 1 << (24 + iota - 12)
	PermSystemMonitor
	PermSystemBackup
	PermSystemMaintenance
)

// 权限组合
const (
	// 基础权限组合
	PermBasicUser   = PermRead
	PermRegularUser = PermRead | PermWrite
	PermPowerUser   = PermRead | PermWrite | PermExecute
	PermAdminUser   = PermRead | PermWrite | PermExecute | PermDelete

	// 角色权限组合
	PermEditor     = PermContentView | PermContentCreate | PermContentUpdate
	PermManager    = PermEditor | PermContentDelete | PermUserView | PermUserCreate
	PermAdmin      = PermManager | PermUserUpdate | PermUserDelete | PermSystemConfig
	PermSuperAdmin = PermAdmin | PermSystemMonitor | PermSystemBackup | PermSystemMaintenance
)

// 权限名称映射
var permissionNames = map[uint64]string{
	PermRead:              "读取",
	PermWrite:             "写入",
	PermExecute:           "执行",
	PermDelete:            "删除",
	PermUserView:          "查看用户",
	PermUserCreate:        "创建用户",
	PermUserUpdate:        "更新用户",
	PermUserDelete:        "删除用户",
	PermContentView:       "查看内容",
	PermContentCreate:     "创建内容",
	PermContentUpdate:     "更新内容",
	PermContentDelete:     "删除内容",
	PermSystemConfig:      "系统配置",
	PermSystemMonitor:     "系统监控",
	PermSystemBackup:      "系统备份",
	PermSystemMaintenance: "系统维护",
}

// 用户权限管理器
type PermissionManager struct {
	userPermissions map[string]uint64 // 用户ID -> 权限位掩码
}

// 创建权限管理器
func NewPermissionManager() *PermissionManager {
	return &PermissionManager{
		userPermissions: make(map[string]uint64),
	}
}

// 授予权限
func (pm *PermissionManager) GrantPermission(userID string, permission uint64) {
	pm.userPermissions[userID] |= permission
}

// 撤销权限
func (pm *PermissionManager) RevokePermission(userID string, permission uint64) {
	pm.userPermissions[userID] &^= permission // 按位与非
}

// 检查权限
func (pm *PermissionManager) HasPermission(userID string, permission uint64) bool {
	userPerms, exists := pm.userPermissions[userID]
	if !exists {
		return false
	}
	return (userPerms & permission) == permission
}

// 检查任一权限
func (pm *PermissionManager) HasAnyPermission(userID string, permissions uint64) bool {
	userPerms, exists := pm.userPermissions[userID]
	if !exists {
		return false
	}
	return (userPerms & permissions) != 0
}

// 获取用户所有权限
func (pm *PermissionManager) GetUserPermissions(userID string) uint64 {
	return pm.userPermissions[userID]
}

// 设置用户权限
func (pm *PermissionManager) SetUserPermissions(userID string, permissions uint64) {
	pm.userPermissions[userID] = permissions
}

// 权限可视化
func (pm *PermissionManager) DisplayPermissions(userID string) {
	userPerms, exists := pm.userPermissions[userID]
	if !exists {
		fmt.Printf("用户 %s 不存在\n", userID)
		return
	}

	fmt.Printf("=== 用户 %s 的权限详情 ===\n", userID)
	fmt.Printf("权限值: %d (二进制: %064b)\n", userPerms, userPerms)

	fmt.Println("拥有的权限:")
	count := 0
	for perm, name := range permissionNames {
		if (userPerms & perm) != 0 {
			fmt.Printf("  ✅ %s (位: %d)\n", name, perm)
			count++
		}
	}

	if count == 0 {
		fmt.Println("  无任何权限")
	}

	fmt.Println()
}

// 权限比较
func (pm *PermissionManager) ComparePermissions(userID1, userID2 string) {
	perms1 := pm.GetUserPermissions(userID1)
	perms2 := pm.GetUserPermissions(userID2)

	fmt.Printf("=== 权限比较: %s vs %s ===\n", userID1, userID2)

	// 共同权限
	common := perms1 & perms2
	fmt.Println("共同权限:")
	pm.displayPermissionSet(common)

	// 用户1独有权限
	unique1 := perms1 &^ perms2
	fmt.Printf("%s 独有权限:\n", userID1)
	pm.displayPermissionSet(unique1)

	// 用户2独有权限
	unique2 := perms2 &^ perms1
	fmt.Printf("%s 独有权限:\n", userID2)
	pm.displayPermissionSet(unique2)

	fmt.Println()
}

// 显示权限集合
func (pm *PermissionManager) displayPermissionSet(permissions uint64) {
	if permissions == 0 {
		fmt.Println("  无")
		return
	}

	for perm, name := range permissionNames {
		if (permissions & perm) != 0 {
			fmt.Printf("  - %s\n", name)
		}
	}
}

// 批量权限操作
func (pm *PermissionManager) BatchGrantPermissions(userID string, permissions []uint64) {
	for _, perm := range permissions {
		pm.GrantPermission(userID, perm)
	}
}

// 权限模板应用
func (pm *PermissionManager) ApplyRoleTemplate(userID, role string) {
	var template uint64

	switch role {
	case "guest":
		template = PermBasicUser
	case "user":
		template = PermRegularUser
	case "editor":
		template = PermEditor
	case "manager":
		template = PermManager
	case "admin":
		template = PermAdmin
	case "superadmin":
		template = PermSuperAdmin
	default:
		fmt.Printf("未知角色: %s\n", role)
		return
	}

	pm.SetUserPermissions(userID, template)
	fmt.Printf("已为用户 %s 应用角色模板: %s\n", userID, role)
}

func main() {
	pm := NewPermissionManager()

	// 演示权限系统在编程导航网站的应用
	fmt.Println("=== 编程导航权限管理系统 ===\n")

	// 创建不同角色的用户
	users := map[string]string{
		"zhang_san": "user",
		"li_si":     "editor",
		"wang_wu":   "manager",
		"zhao_liu":  "admin",
		"admin":     "superadmin",
	}

	// 应用角色模板
	fmt.Println("1. 应用角色模板:")
	for userID, role := range users {
		pm.ApplyRoleTemplate(userID, role)
	}
	fmt.Println()

	// 显示每个用户的权限
	fmt.Println("2. 用户权限详情:")
	for userID := range users {
		pm.DisplayPermissions(userID)
	}

	// 权限检查演示
	fmt.Println("3. 权限检查演示:")

	checkCases := []struct {
		userID     string
		permission uint64
		action     string
	}{
		{"zhang_san", PermRead, "读取文章"},
		{"zhang_san", PermContentCreate, "创建内容"},
		{"li_si", PermContentCreate, "创建内容"},
		{"li_si", PermUserDelete, "删除用户"},
		{"wang_wu", PermUserCreate, "创建用户"},
		{"zhao_liu", PermSystemConfig, "系统配置"},
		{"admin", PermSystemMaintenance, "系统维护"},
	}

	for _, check := range checkCases {
		hasPermission := pm.HasPermission(check.userID, check.permission)
		status := "❌ 拒绝"
		if hasPermission {
			status = "✅ 允许"
		}
		fmt.Printf("%s %s 执行 '%s'\n", status, check.userID, check.action)
	}
	fmt.Println()

	// 动态权限管理
	fmt.Println("4. 动态权限管理:")

	// 为普通用户临时授予特殊权限
	fmt.Println("为 zhang_san 临时授予内容创建权限")
	pm.GrantPermission("zhang_san", PermContentCreate)

	canCreate := pm.HasPermission("zhang_san", PermContentCreate)
	fmt.Printf("zhang_san 现在可以创建内容: %t\n", canCreate)

	// 撤销权限
	fmt.Println("撤销 zhang_san 的内容创建权限")
	pm.RevokePermission("zhang_san", PermContentCreate)

	canCreateAfter := pm.HasPermission("zhang_san", PermContentCreate)
	fmt.Printf("撤销后 zhang_san 可以创建内容: %t\n", canCreateAfter)
	fmt.Println()

	// 权限比较
	fmt.Println("5. 权限比较:")
	pm.ComparePermissions("li_si", "wang_wu")

	// 复杂权限检查
	fmt.Println("6. 复杂权限检查:")

	// 检查是否拥有任一管理权限
	managerPermissions := PermUserView | PermUserCreate | PermUserUpdate | PermUserDelete

	for userID := range users {
		hasAnyManager := pm.HasAnyPermission(userID, managerPermissions)
		fmt.Printf("%s 拥有管理权限: %t\n", userID, hasAnyManager)
	}
}
