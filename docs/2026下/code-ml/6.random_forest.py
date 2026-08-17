"""
6. 随机森林 vs 决策树 + 网格搜索
- 数据集：乳腺癌
- 对比：单棵决策树 vs 随机森林 vs GridSearchCV 调参后的随机森林
"""
import os
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

X, y = load_breast_cancer(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# 1. 单棵决策树
tree = DecisionTreeClassifier(random_state=22)
tree.fit(x_train, y_train)
tree_score = tree.score(x_test, y_test)

# 2. 随机森林
rf = RandomForestClassifier(random_state=22)
rf.fit(x_train, y_train)
rf_score = rf.score(x_test, y_test)

# 3. 网格搜索 + 交叉验证
params = {'n_estimators': [10, 20, 50, 100], 'max_depth': [2, 3, 4, 5]}
gs = GridSearchCV(estimator=rf, param_grid=params, cv=3, n_jobs=-1)
gs.fit(x_train, y_train)
gs_score = gs.best_estimator_.score(x_test, y_test)
print(f'最优参数: {gs.best_params_}')

print(f'决策树得分: {tree_score:.4f}')
print(f'随机森林得分: {rf_score:.4f}')
print(f'网格搜索最优模型得分: {gs_score:.4f}')

# 特征重要性（取前 10 个最重要的特征）
feat_names = load_breast_cancer().feature_names
importances = gs.best_estimator_.feature_importances_
top10_idx = np.argsort(importances)[-10:]

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# 左图：三个模型得分对比
scores = [tree_score, rf_score, gs_score]
labels = ['决策树', '随机森林', '随机森林(网格搜索)']
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
bars = axes[0].bar(labels, scores, color=colors)
axes[0].set_ylim(0.8, 1.0)
axes[0].set_ylabel('测试集准确率')
axes[0].set_title('单棵树 vs 随机森林 准确率对比')
for bar, s in zip(bars, scores):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                 f'{s:.4f}', ha='center', va='bottom', fontsize=11)
axes[0].grid(alpha=0.3, axis='y')

# 右图：Top 10 特征重要性
axes[1].barh(range(len(top10_idx)), importances[top10_idx], color='#2ca02c')
axes[1].set_yticks(range(len(top10_idx)))
axes[1].set_yticklabels([feat_names[i] for i in top10_idx], fontsize=10)
axes[1].set_xlabel('特征重要性')
axes[1].set_title('随机森林：Top 10 最重要特征')
axes[1].grid(alpha=0.3, axis='x')

plt.tight_layout()
out = os.path.join(IMG_DIR, '6.random_forest.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
