"""
7. SVM 线性核 vs RBF 核
- 案例一：鸢尾花二分类（线性可分）
- 案例二：make_moons 月牙形数据（线性不可分 → 需要 RBF 核）
- 演示 gamma 参数对 RBF 核决策边界的影响
"""
import os
import numpy as np
from sklearn.datasets import load_iris, make_moons
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC, SVC
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def plot_decision_boundary(model, X, y, ax, title):
    """画决策边界"""
    h = 0.02
    x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
    Z = model.predict(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
    ax.contourf(xx, yy, Z, alpha=0.3, cmap=plt.cm.RdBu)
    ax.scatter(X[y == 0, 0], X[y == 0, 1], c='red', s=30, edgecolors='k', linewidth=0.3, label='类别 0')
    ax.scatter(X[y == 1, 0], X[y == 1, 1], c='blue', s=30, edgecolors='k', linewidth=0.3, label='类别 1')
    ax.set_title(title)
    ax.legend()
    ax.grid(alpha=0.3)


# ============ 案例一：线性 SVM（鸢尾花二分类） ============
X, y = load_iris(return_X_y=True)
x, y = X[y < 2, :2], y[y < 2]   # 只取前两维，便于可视化

scaler = StandardScaler()
x_std = scaler.fit_transform(x)
model_linear = LinearSVC(C=10, dual='auto', random_state=22)
model_linear.fit(x_std, y)
acc_linear = accuracy_score(y, model_linear.predict(x_std))
print(f'线性 SVM 准确率: {acc_linear:.4f}')

# ============ 案例二：RBF 核 SVM（月牙形数据） ============
x_moon, y_moon = make_moons(noise=0.15, random_state=22, n_samples=300)
scaler2 = StandardScaler()
x_moon_std = scaler2.fit_transform(x_moon)

# 不同 gamma 的 RBF 核（gamma 越大越复杂，越容易过拟合）
gammas = [0.1, 1.0, 100]
models_rbf = []
for g in gammas:
    m = SVC(kernel='rbf', gamma=g, random_state=22)
    m.fit(x_moon_std, y_moon)
    acc = accuracy_score(y_moon, m.predict(x_moon_std))
    models_rbf.append((m, g, acc))
    print(f'RBF SVM gamma={g} 准确率: {acc:.4f}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 4, figsize=(20, 5))

# 1. 线性 SVM 决策边界（鸢尾花）
plot_decision_boundary(model_linear, x_std, y, axes[0],
                       f'线性 SVM 鸢尾花\n准确率={acc_linear:.2%}')

# 2-4. 不同 gamma 的 RBF 决策边界
for ax, (m, g, acc) in zip(axes[1:], models_rbf):
    plot_decision_boundary(m, x_moon_std, y_moon, ax,
                           f'RBF SVM γ={g}\n准确率={acc:.2%}')

plt.suptitle('SVM 决策边界对比（线性核 vs RBF 核）', fontsize=14, y=0.98)
plt.tight_layout()
out = os.path.join(IMG_DIR, '7.svm.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
