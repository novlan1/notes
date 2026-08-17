"""
2. Ridge / Lasso 正则化对比
- 同一组高次多项式数据，对比 Linear / Ridge / Lasso 的系数差异
"""
import os
import numpy as np
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_squared_error
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 1. 造一组"高次多项式"数据（特征多、易过拟合）
np.random.seed(22)
x = np.random.uniform(-3, 3, size=100)
y = 0.5 * x ** 2 + x + 2 + np.random.normal(0, 1, size=100)

X = x.reshape(-1, 1)
X_poly = np.hstack([X ** i for i in range(1, 11)])   # 10 个高次特征

# 2. 普通线性回归（无正则，系数可能很大）
lr = LinearRegression().fit(X_poly, y)
print('Linear 系数:', lr.coef_)

# 3. Lasso（L1 正则：部分系数压缩为 0，做特征选择）
# 10 阶多项式特征 + alpha=0.1 默认 max_iter=1000 不够；调大迭代+放宽 tol 避免警告
lasso = Lasso(alpha=0.1, max_iter=100000, tol=1e-2, random_state=22).fit(X_poly, y)
print('Lasso 系数:', lasso.coef_)          # 很多 0 → 稀疏解

# 4. Ridge（L2 正则：系数整体缩小，但不为 0）
ridge = Ridge(alpha=0.1, random_state=22).fit(X_poly, y)
print('Ridge 系数:', ridge.coef_)          # 都接近 0 但非 0

# 5. MSE 对比
mse_lr = mean_squared_error(y, lr.predict(X_poly))
mse_lasso = mean_squared_error(y, lasso.predict(X_poly))
mse_ridge = mean_squared_error(y, ridge.predict(X_poly))
print('Linear MSE:', mse_lr)
print('Lasso  MSE:', mse_lasso)
print('Ridge  MSE:', mse_ridge)

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：三个模型系数对比（直方图）
x_idx = np.arange(1, 11)
width = 0.28
axes[0].bar(x_idx - width, lr.coef_, width, label='Linear (无正则)', color='#1f77b4')
axes[0].bar(x_idx, ridge.coef_, width, label='Ridge (L2)', color='#ff7f0e')
axes[0].bar(x_idx + width, lasso.coef_, width, label='Lasso (L1)', color='#2ca02c')
axes[0].axhline(0, color='black', linewidth=0.5)
axes[0].set_xlabel('特征次方 i（x^i）')
axes[0].set_ylabel('系数值')
axes[0].set_title('Linear / Ridge / Lasso 系数对比（高次多项式）')
axes[0].set_xticks(x_idx)
axes[0].legend()
axes[0].grid(alpha=0.3, axis='y')

# 右图：三个模型拟合曲线对比
x_test = np.linspace(-3, 3, 200).reshape(-1, 1)
x_test_poly = np.hstack([x_test ** i for i in range(1, 11)])

axes[1].scatter(x, y, color='gray', alpha=0.5, s=20, label='数据点')
sort_idx = np.argsort(x.flatten())
axes[1].plot(np.sort(x.flatten()), lr.predict(X_poly)[sort_idx], label=f'Linear (MSE={mse_lr:.2f})', linewidth=2)
axes[1].plot(np.sort(x.flatten()), ridge.predict(X_poly)[sort_idx], label=f'Ridge  (MSE={mse_ridge:.2f})', linewidth=2, linestyle='--')
axes[1].plot(np.sort(x.flatten()), lasso.predict(X_poly)[sort_idx], label=f'Lasso  (MSE={mse_lasso:.2f})', linewidth=2, linestyle=':')
axes[1].set_xlabel('x')
axes[1].set_ylabel('y')
axes[1].set_title('三模型拟合曲线对比')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/2.ridge.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
