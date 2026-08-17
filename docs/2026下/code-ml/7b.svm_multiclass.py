"""
7b. SVM 多分类（OvO vs OvR）
- 笔记章节：第 48/49 章
- 数据集：鸢尾花（3 分类）
- 演示：decision_function_shape 参数选 OvR / OvO 策略

笔记原 demo（第 49 章 5) Python 实现）：SVC(decision_function_shape='ovo')
本脚本扩展为：1) 原 demo 可运行；2) OvO vs OvR 对比 + 可视化
"""
import os
import numpy as np
from sklearn import svm
from sklearn import datasets
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============ 案例一：笔记原 demo（OvO 策略） ============
print('=' * 50)
print('案例一：笔记原 demo（SVM 多分类 OvO 策略）')
print('=' * 50)

iris = datasets.load_iris()
X = iris.data
y = iris.target

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

model = svm.SVC(decision_function_shape='ovo')
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
print(f'OvO 准确率: {accuracy_score(y_test, y_pred):.4f}')

# 看 OvO 内部训练了多少个二分类器（N*(N-1)/2 = 3*2/2 = 3 个）
print(f'OvO 二分类器数量（N*(N-1)/2）: {len(model.n_support_)}')

# ============ 案例二：OvO vs OvR 对比 ============
print()
print('=' * 50)
print('案例二：OvO vs OvR 策略对比（RBF 核）')
print('=' * 50)

strategies = ['ovo', 'ovr']
results = {}
for s in strategies:
    m = svm.SVC(kernel='rbf', decision_function_shape=s, random_state=42)
    m.fit(X_train, y_train)
    acc = accuracy_score(y_test, m.predict(X_test))
    results[s] = (m, acc)
    print(f'decision_function_shape={s} → 准确率 {acc:.4f}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：OvO vs OvR 准确率对比
labels = ['OvO\n(一对一)', 'OvR\n(一对多)']
accs = [results['ovo'][1], results['ovr'][1]]
colors = ['#1f77b4', '#ff7f0e']
bars = axes[0].bar(labels, accs, color=colors, width=0.5)
axes[0].set_ylim(0.8, 1.0)
axes[0].set_ylabel('测试集准确率')
axes[0].set_title('SVM 多分类：OvO vs OvR 策略准确率', pad=10)
for bar, a in zip(bars, accs):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.005,
                 f'{a:.4f}', ha='center', va='bottom', fontsize=11)
axes[0].grid(alpha=0.3, axis='y')

# 右图：用前两维特征画 3 类数据 + 决策边界（OvR）
x_2d, y_2d = X[:, :2], y
m_2d = svm.SVC(kernel='linear', decision_function_shape='ovr', random_state=42)
m_2d.fit(x_2d, y_2d)

h = 0.02
x_min, x_max = x_2d[:, 0].min() - 0.5, x_2d[:, 0].max() + 0.5
y_min, y_max = x_2d[:, 1].min() - 0.5, x_2d[:, 1].max() + 0.5
xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
Z = m_2d.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
axes[1].contourf(xx, yy, Z, alpha=0.3, cmap=plt.cm.RdYlBu)
colors_pts = ['#1f77b4', '#ff7f0e', '#2ca02c']
names = ['setosa (0)', 'versicolor (1)', 'virginica (2)']
for cls in range(3):
    axes[1].scatter(x_2d[y_2d == cls, 0], x_2d[y_2d == cls, 1],
                    c=colors_pts[cls], label=names[cls], s=40, alpha=0.7,
                    edgecolors='k', linewidth=0.3)
axes[1].set_xlabel('花萼长度 (cm)')
axes[1].set_ylabel('花萼宽度 (cm)')
axes[1].set_title('SVM 多分类决策边界（前两维特征，OvR）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = os.path.join(IMG_DIR, '7b.svm_multiclass.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
