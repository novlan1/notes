# Redis 入门示例脚本
# 依赖：pip install redis
# 前置：本机启动 redis-server（默认 6379 端口）
# 运行：python code.py
# 注意：Redis 所有值都是字符串（如 age 返回 '20' 而非 20）；incr 会持久累加

import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# 写缓存 + 加过期
r.set("user:1:name", "tom", ex=60)
print(r.get("user:1:name"))   # → tom

# 计数器
r.incr("page:views")
print(r.get("page:views"))    # → 1

# Hash
r.hset("user:1", mapping={"name": "tom", "age": 20})
print(r.hgetall("user:1"))
