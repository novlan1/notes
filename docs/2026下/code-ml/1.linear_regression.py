"""
1. 线性回归
- 案例一：单变量线性回归（身高 → 体重）
- 案例二：正规方程 vs 梯度下降（回归对比）
"""
import os
import numpy as np
from sklearn.linear_model import LinearRegression, SGDRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
from sklearn.datasets import load_diabetes
import matplotlib.pyplot as plt

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============ 案例一：单变量线性回归（身高 → 体重） ============
print('=' * 50)
print('案例一：单变量线性回归（身高 → 体重）')
print('=' * 50)

x = [[160], [166], [172], [174], [180]]   # 身高 cm
y = [56.3, 60.6, 65.1, 68.5, 75]         # 体重 kg
x_arr = np.array(x).flatten()           # 1D 数组，便于 scatter 画图
y_arr = np.array(y)

model = LinearRegression()
model.fit(x, y)
print('权重（斜率 w）:', model.coef_)
print('偏置（截距 b）:', model.intercept_)
print('预测 176cm 的体重:', model.predict([[176]]))

# ============ 案例二：正规方程 vs 梯度下降（回归对比） ============
print()
print('=' * 50)
print('案例二：糖尿病数据集：正规方程 vs 梯度下降')
print('=' * 50)

X, y = load_diabetes(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

scaler = StandardScaler()
x_train = scaler.fit_transform(x_train)
x_test = scaler.transform(x_test)

# 正规方程：一次求解最优参数
model1 = LinearRegression()
model1.fit(x_train, y_train)
mse1 = mean_squared_error(y_test, model1.predict(x_test))

# 梯度下降：迭代逼近最优参数
# max_iter 调到 5000 避免 ConvergenceWarning（笔记里有说明）
model2 = SGDRegressor(learning_rate='constant', eta0=0.01, max_iter=5000, tol=1e-4, random_state=22)
model2.fit(x_train, y_train)
mse2 = mean_squared_error(y_test, model2.predict(x_test))

print('正规方程 MSE:', mse1)
print('梯度下降 MSE:', mse2)

# ============ 可视化：真实值 vs 预测值 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：单变量线性回归拟合效果
x_plot = np.array([150, 185]).reshape(-1, 1)
y_plot = model.predict(x_plot)
axes[0].scatter(x_arr, y_arr, color='blue', s=50, label='数据点')
axes[0].plot(x_plot, y_plot, color='red', label=f'y = {model.coef_[0]:.3f}·x + {model.intercept_:.3f}')
axes[0].set_xlabel('身高 (cm)')
axes[0].set_ylabel('体重 (kg)')
axes[0].set_title('单变量线性回归：身高 → 体重')
axes[0].legend()
axes[0].grid(alpha=0.3)

# 右图：真实值 vs 预测值（糖尿病数据集）
axes[1].scatter(y_test, model1.predict(x_test), alpha=0.6, label=f'正规方程 MSE={mse1:.2f}', s=30)
axes[1].scatter(y_test, model2.predict(x_test), alpha=0.6, label=f'梯度下降 MSE={mse2:.2f}', s=30)
axes[1].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'k--', lw=1)
axes[1].set_xlabel('真实值')
axes[1].set_ylabel('预测值')
axes[1].set_title('糖尿病数据集：真实值 vs 预测值')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/1.linear_regression.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
