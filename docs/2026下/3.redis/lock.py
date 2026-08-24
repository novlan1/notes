# Redis 分布式锁示例
# 依赖：pip install redis
# 前置：本机启动 redis-server（默认 6379 端口）
# 运行：python lock.py

import redis
import uuid
import time

r = redis.Redis(decode_responses=True)


def acquire_lock(key, expire=10):
    """拿锁：SET key token NX EX expire，成功返回 token，失败返回 None"""
    token = uuid.uuid4().hex
    return token if r.set(key, token, nx=True, ex=expire) else None


def release_lock(key, token):
    """释放锁：Lua 脚本保证「校验是否自己的锁」+「删除」两步原子执行，防止误删别人的锁"""
    lua = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """
    return r.eval(lua, 1, key, token)


def demo():
    key = "lock:order:123"
    token = acquire_lock(key, expire=10)
    if token:
        print(f"拿到锁 token={token}")
        try:
            time.sleep(1)   # 模拟业务逻辑
        finally:
            result = release_lock(key, token)
            print(f"释放锁 result={result}")
    else:
        print("没拿到锁")


if __name__ == "__main__":
    demo()
