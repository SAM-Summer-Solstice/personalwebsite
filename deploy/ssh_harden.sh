#!/bin/bash
set -e

echo "=== Task 6: SSH 安全加固 ==="

# 1. 修改 pi 用户密码（交互式输入，不硬编码，避免泄露到 Git）
read -s -p "请输入 pi 用户的新密码: " PI_PASSWORD
echo
read -s -p "请再次确认密码: " PI_PASSWORD_CONFIRM
echo

if [ "$PI_PASSWORD" != "$PI_PASSWORD_CONFIRM" ]; then
    echo "两次输入的密码不一致，已退出。"
    exit 1
fi

if [ -z "$PI_PASSWORD" ]; then
    echo "密码不能为空，已退出。"
    exit 1
fi

echo ">>> [1/4] 修改 pi 用户密码..."
echo "pi:${PI_PASSWORD}" | sudo chpasswd
echo "  pi 密码已更新"

# 2. 禁止 root SSH 直接登录
echo ">>> [2/4] 禁止 root SSH 直接登录..."
SSHD_CONFIG="/etc/ssh/sshd_config"

if grep -q "^#*PermitRootLogin" "$SSHD_CONFIG"; then
    sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
else
    echo "PermitRootLogin no" | sudo tee -a "$SSHD_CONFIG" > /dev/null
fi
echo "  PermitRootLogin 已设为 no"

# 3. 验证配置语法
echo ">>> [3/4] 验证 sshd 配置语法..."
sudo sshd -t && echo "  配置语法正确" || { echo "  配置有误！"; exit 1; }

# 4. 重启 sshd 服务（不会断开当前连接）
echo ">>> [4/4] 重启 sshd 服务..."
sudo systemctl restart sshd
echo "  sshd 已重启"

echo ""
echo "=== 验证结果 ==="
echo "--- 当前 PermitRootLogin 设置 ---"
grep "^PermitRootLogin" "$SSHD_CONFIG"
echo ""
echo "--- sshd 服务状态 ---"
sudo systemctl is-active sshd && echo "  sshd: active" || echo "  sshd: 异常"
sudo systemctl is-enabled sshd && echo "  sshd: enabled (开机自启)" || echo "  sshd: 未启用自启"

echo ""
echo "=== 加固完成 ==="
echo "pi 密码: 已更新（请妥善保管，脚本不保存密码）"
echo "root SSH 登录: 已禁止"
echo ""
echo "注意: 当前 SSH 连接不受影响，下次连接时:"
echo "  - 用 pi 用户登录: ssh pi@10.83.36.241 (新密码)"
echo "  - root 直接登录将被拒绝"
echo "  - 登录后需 root 权限: sudo -i"
