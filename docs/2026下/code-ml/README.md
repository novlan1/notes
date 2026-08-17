# 机器学习算法代码

与 `../0.机器学习.md` 笔记配套，每个脚本独立可运行，运行后自动在 `img/` 下生成对比图。

## 目录

| # | 脚本 | 算法 | 章节 |
|---|------|------|------|
| 1 | 1.linear_regression.py | 线性回归（单变量 + 正规方程 vs 梯度下降） | 第 10/11 章 |
| 2 | 2.ridge.py | Ridge / Lasso 正则化对比 | 第 13 章 |
| 3 | 3.logistic_regression.py | 逻辑回归二分类（乳腺癌数据集） | 第 14 章 |
| 4 | 4.knn.py | KNN 近邻算法（鸢尾花） | 第 19 章 |
| 5 | 5.decision_tree.py | 决策树分类 | 第 62 章 |
| 6 | 6.random_forest.py | 随机森林 vs 决策树 + 网格搜索 | 第 70 章 |
| 7 | 7.svm.py | SVM 线性核 vs RBF 核 | 第 47 章 |
| 8 | 8.adaboost.py | Adaboost vs 单决策树桩 | 第 76 章 |
| 9 | 9.gbdt.py | GBDT 梯度提升树 | 第 82 章 |
| 10 | 10.xgboost.py | XGBoost 多分类 | 第 81 章 |
| 11 | 11.naive_bayes.py | 朴素贝叶斯三种模型对比 | 第 57 章 |
| 12 | 12.kmeans.py | K-means 聚类（4 簇数据） | 第 29 章 |
| 12b | 12b.kmeans_silhouette.py | K-means + 轮廓系数（笔记 demo 扩展） | 第 29/38 章 |
| 13 | 13.pca.py | PCA 主成分分析 | 第 89 章 |
| 14 | 14.lda.py | LDA 线性判别分析 | 第 91 章 |
| 15 | 15.silhouette.py | 轮廓系数（笔记原有 demo 扩展） | 第 38 章 |
| 16 | 16.gmm_em.py | GMM + EM（笔记原有 demo 扩展） | 第 39/41/44 章 |

## 运行

```bash
# 单个脚本
python 1.linear_regression.py

# 全部跑一遍
for f in [0-9]*.py; do echo "=== $f ==="; python "$f"; done
```

## 依赖

```bash
pip install numpy pandas scikit-learn matplotlib
pip install xgboost   # 跑 10.xgboost.py 还需要这个

# macOS 用户 XGBoost 还需要 OpenMP 运行时：
brew install libomp
```

## 图

每个脚本运行后会在 `img/` 目录下生成 `*.png` 对比图，文件名与脚本名对应（如 `1.linear_regression.png`）。
