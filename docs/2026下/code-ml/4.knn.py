"""
4. KNN 近邻算法
- 数据集：鸢尾花（150 样本，4 特征，3 分类）
- 演示 K 值不同时的准确率变化（用于选 K）
"""
import os
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_iris(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=22)

# KNN 依赖距离计算，必须先标准化（消除量纲影响）
scaler = StandardScaler()
x_train = scaler.fit_transform(x_train)
x_test = scaler.transform(x_test)

# 不同 K 值的准确率（找最优 K）
k_range = range(1, 31)
accuracies = []
for k in k_range:
    model = KNeighborsClassifier(n_neighbors=k)
    model.fit(x_train, y_train)
    accuracies.append(accuracy_score(y_test, model.predict(x_test)))

best_k = k_range[np.argmax(accuracies)]
print(f'最优 K = {best_k}（准确率 {max(accuracies):.4f}）')

# 训练最终模型
model = KNeighborsClassifier(n_neighbors=3)
model.fit(x_train, y_train)
print(f'K=3 准确率: {accuracy_score(y_test, model.predict(x_test)):.4f}')

# 预测概率
sample = scaler.transform([[5.1, 3.5, 1.4, 0.2]])
print('样本 [5.1, 3.5, 1.4, 0.2] 预测概率:', model.predict_proba(sample))

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：K 值 vs 准确率
axes[0].plot(k_range, accuracies, 'o-', linewidth=2, markersize=6)
axes[0].axvline(best_k, color='red', linestyle='--', label=f'最优 K={best_k}')
axes[0].set_xlabel('K 值（邻居数）')
axes[0].set_ylabel('测试集准确率')
axes[0].set_title('KNN：不同 K 值的准确率（K 太小学偏、K 太大欠拟合）')
axes[0].set_xticks(list(k_range))
axes[0].grid(alpha=0.3)
axes[0].legend()

# 右图：鸢尾花前两维特征散点（按真实标签着色）
x_train_orig = scaler.inverse_transform(x_train)
x_test_orig = scaler.inverse_transform(x_test)
all_x = np.vstack([x_train_orig, x_test_orig])
all_y = np.concatenate([y_train, y_test])
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
labels = ['setosa (0)', 'versicolor (1)', 'virginica (2)']
for cls in range(3):
    axes[1].scatter(all_x[all_y == cls, 0], all_x[all_y == cls, 1],
                    c=colors[cls], label=labels[cls], s=40, alpha=0.7, edgecolors='k', linewidth=0.3)
axes[1].set_xlabel('花萼长度 (cm)')
axes[1].set_ylabel('花萼宽度 (cm)')
axes[1].set_title('鸢尾花数据集（前两维特征可视化）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/4.knn.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
