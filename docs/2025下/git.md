### 1. 修改最新 commit 的 message

```bash
git commit --amend
```

### 2. 修改老旧commit的message

```bash
git rebase -i [要更改的commit的上一级commit]
```

git rebase工作的过程中，就是用了分离头指针。rebase意味着基于新base的commit来变更部分commits。它处理的时候，把HEAD指向base的commit，此时如果该commit没有对应branch，就处于分离头指针的状态，然后重新一个一个生成新的commit，当rebase创建完最后一个commit后，结束分离头状态，Git让变完基的分支名指向HEAD。


### 3. 把连续的多个commit整理成1个

```bash
git rebase -i [要更改的commit的上一级commit]
```

```bash
pick   7735d66 update #合并到该commit上
squash bbe6d53 update
squash 9eb3188 update
squash 7d33868 update
# Rebase d9f9d11..7d33868 onto d9f9d11 (4 commands)
#
# Commands:
# p, pick <commit> = use commit
# r, reword <commit> = use commit, but edit the commit message
# e, edit <commit> = use commit, but stop for amending
# s, squash <commit> = use commit, but meld into previous commit
# f, fixup <commit> = like "squash", but discard this commit's log message
# x, exec <command> = run command (the rest of the line) using shell
# b, break = stop here (continue rebase later with 'git rebase --continue')
# d, drop <commit> = remove commit
# l, label <label> = label current HEAD with a name
# t, reset <label> = reset HEAD to a label
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
# .       create a merge commit using the original merge commit's
# .       message (or the oneline, if no original merge commit was
# .       specified). Use -c <commit> to reword the commit message.
```
