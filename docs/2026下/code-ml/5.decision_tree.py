"""
5. 决策树分类
- 数据集：鸢尾花
- 对比 max_depth 不同时的过拟合/欠拟合
- 输出特征重要性
"""
import os
import numpy as np
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_iris(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# 对比 max_depth（预剪枝关键参数）
depths = [1, 2, 3, 4, 5, 8, None]
train_accs, test_accs = [], []
for d in depths:
    model = DecisionTreeClassifier(max_depth=d, random_state=22)
    model.fit(x_train, y_train)
    train_accs.append(accuracy_score(y_train, model.predict(x_train)))
    test_accs.append(accuracy_score(y_test, model.predict(x_test)))

# 训练最终模型
model = DecisionTreeClassifier(max_depth=3, random_state=22)
model.fit(x_train, y_train)
print(f'max_depth=3 训练集准确率: {accuracy_score(y_train, model.predict(x_train)):.4f}')
print(f'max_depth=3 测试集准确率: {accuracy_score(y_test, model.predict(x_test)):.4f}')
print('特征重要性:', dict(zip(load_iris().feature_names, model.feature_importances_)))

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig = plt.figure(figsize=(18, 10))

# 左图：训练集 vs 测试集准确率
ax1 = fig.add_subplot(1, 2, 1)
depths_label = [str(d) if d else 'None' for d in depths]
x_pos = np.arange(len(depths))
ax1.bar(x_pos - 0.2, train_accs, 0.4, label='训练集', color='#1f77b4')
ax1.bar(x_pos + 0.2, test_accs, 0.4, label='测试集', color='#ff7f0e')
ax1.set_xticks(x_pos)
ax1.set_xticklabels(depths_label)
ax1.set_xlabel('max_depth')
ax1.set_ylabel('准确率')
ax1.set_title('决策树：不同 max_depth 下的过拟合/欠拟合')
ax1.legend()
ax1.grid(alpha=0.3, axis='y')

# 右图：决策树结构（max_depth=3）
ax2 = fig.add_subplot(1, 2, 2)
plot_tree(model, ax=ax2, feature_names=load_iris().feature_names,
          class_names=['setosa', 'versicolor', 'virginica'], filled=True, rounded=True, fontsize=9)
ax2.set_title('决策树结构（max_depth=3）')

plt.tight_layout()
out = 'img/5.decision_tree.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
