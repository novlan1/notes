"""
3. 逻辑回归二分类
- 数据集：乳腺癌（569 个样本，30 个特征，二分类：恶性/良性）
- 评估：准确率 + 混淆矩阵 + 精确率/召回率/F1 + predict_proba 概率
"""
import os
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score, f1_score
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# 1. 加载数据
X, y = load_breast_cancer(return_X_y=True)
print('数据集 shape:', X.shape, '类别分布:', np.bincount(y))   # 0=恶性 1=良性

# 2. 划分训练集 / 测试集
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

# 3. 标准化（逻辑回归对特征尺度敏感）
scaler = StandardScaler()
x_train = scaler.fit_transform(x_train)
x_test = scaler.transform(x_test)

# 4. 训练
model = LogisticRegression(max_iter=1000)
model.fit(x_train, y_train)

# 5. 预测 + 评估
y_pred = model.predict(x_test)
y_proba = model.predict_proba(x_test)   # 类别概率

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

print(f'准确率: {acc:.4f}')
print(f'精确率: {prec:.4f}')
print(f'召回率: {rec:.4f}')
print(f'F1: {f1:.4f}')
print('混淆矩阵:\n', confusion_matrix(y_test, y_pred))
print('前 5 个样本的预测概率（恶性/良性）:')
print(y_proba[:5])

# ============ 可视化 ============
os.makedirs('img', exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：混淆矩阵
cm = confusion_matrix(y_test, y_pred)
im = axes[0].imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
axes[0].figure.colorbar(im, ax=axes[0])
axes[0].set(xticks=np.arange(cm.shape[1]), yticks=np.arange(cm.shape[0]),
           xticklabels=['恶性', '良性'], yticklabels=['恶性', '良性'],
           ylabel='真实值', xlabel='预测值', title=f'混淆矩阵（准确率={acc:.2%}）')
thresh = cm.max() / 2.
for i in range(cm.shape[0]):
    for j in range(cm.shape[1]):
        axes[0].text(j, i, format(cm[i, j], 'd'),
                     ha="center", va="center",
                     color="white" if cm[i, j] > thresh else "black")

# 右图：预测概率分布
axes[1].hist(y_proba[y_test == 0, 1], bins=20, alpha=0.6, label='真实=恶性（预测良性概率）', color='red')
axes[1].hist(y_proba[y_test == 1, 1], bins=20, alpha=0.6, label='真实=良性（预测良性概率）', color='green')
axes[1].axvline(0.5, color='black', linestyle='--', label='决策阈值 0.5')
axes[1].set_xlabel('预测为"良性"的概率')
axes[1].set_ylabel('样本数')
axes[1].set_title('预测概率分布（Sigmoid 输出）')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
out = 'img/3.logistic_regression.png'
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
