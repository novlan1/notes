"""
11. 朴素贝叶斯三种模型对比
- GaussianNB：连续特征（鸢尾花 4 维连续数据）
- MultinomialNB：离散词频特征（文本分类）
- BernoulliNB：二值特征（0/1 是否出现）
"""
import os
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB, MultinomialNB, BernoulliNB
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import accuracy_score
import matplotlib.pyplot as plt
import numpy as np

# matplotlib 中文显示
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============ 案例一：GaussianNB（鸢尾花连续特征） ============
X, y = load_iris(return_X_y=True)
x_train, x_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=22)

gnb = GaussianNB()
gnb.fit(x_train, y_train)
gnb_acc = accuracy_score(y_test, gnb.predict(x_test))
print(f'GaussianNB（连续特征）准确率: {gnb_acc:.4f}')

# ============ 案例二：MultinomialNB vs BernoulliNB（文本词频） ============
texts = [
    'I love this movie great film amazing wonderful',
    'I hate this movie boring terrible awful',
    'great film love it fantastic excellent',
    'boring film hate it terrible worst',
    'I love this great amazing movie wonderful',
    'I hate this boring awful terrible movie',
    'fantastic great film love it excellent',
    'worst boring film hate it terrible awful',
]
labels = [1, 0, 1, 0, 1, 0, 1, 0]   # 1=正面 0=负面

vectorizer = CountVectorizer()
X_text = vectorizer.fit_transform(texts)

# 8 个样本当训练，留 2 个当测试
x_train_text, x_test_text = X_text[:6], X_text[6:]
y_train_text, y_test_text = labels[:6], labels[6:]

mnb = MultinomialNB().fit(x_train_text, y_train_text)
bnb = BernoulliNB().fit(x_train_text, y_train_text)
mnb_acc = accuracy_score(y_test_text, mnb.predict(x_test_text))
bnb_acc = accuracy_score(y_test_text, bnb.predict(x_test_text))
print(f'MultinomialNB（词频）准确率: {mnb_acc:.4f}')
print(f'BernoulliNB（0/1 是否出现）准确率: {bnb_acc:.4f}')

# ============ 可视化 ============
IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
os.makedirs(IMG_DIR, exist_ok=True)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左图：三种模型准确率
models = ['GaussianNB\n(连续特征)', 'MultinomialNB\n(词频)', 'BernoulliNB\n(0/1)']
accs = [gnb_acc, mnb_acc, bnb_acc]
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']
bars = axes[0].bar(models, accs, color=colors)
axes[0].set_ylim(0.5, 1.0)   # 跟原来一致，靠 pad=15 + subplots_adjust(top=0.88) 给标题让位
axes[0].set_ylabel('测试集准确率')
axes[0].set_title('朴素贝叶斯三种模型准确率对比', pad=25)  # pad=15 标题上移
for bar, a in zip(bars, accs):
    axes[0].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
                 f'{a:.2%}', ha='center', va='bottom', fontsize=11)
axes[0].grid(alpha=0.3, axis='y')

# 右图：词频矩阵热力图
feature_names = vectorizer.get_feature_names_out()
ax = axes[1]
im = ax.imshow(X_text.toarray(), cmap='YlOrRd', aspect='auto')
ax.set_xticks(range(len(feature_names)))
ax.set_xticklabels(feature_names, rotation=45, ha='right', fontsize=8)
ax.set_yticks(range(len(texts)))
ax.set_yticklabels([f'文本{i+1}' for i in range(len(texts))], fontsize=9)
ax.set_title('文本词频矩阵（CountVectorizer）')
plt.colorbar(im, ax=ax, label='词频')
plt.tight_layout()
# 给左图标题预留顶部空间（避免和柱形条数字标签重叠）
fig.subplots_adjust(top=0.88, wspace=0.25)

out = os.path.join(IMG_DIR, '11.naive_bayes.png')
plt.savefig(out, dpi=120, bbox_inches='tight')
print(f'图已保存: {out}')
plt.show()
