#!/bin/bash
set -e

################################
# 基础配置
################################
NAS_USER="millerchu"
NAS_HOST="greennas"

NAS_SCP_DIR="/Projects/GAK-Web"
NAS_SSH_DIR="/volume1/Projects/GAK-Web"

CONTAINER_NAME="my-nginx"

TIME=$(date +"%Y%m%d_%H%M%S")
PKG_NAME="dist_${TIME}.tar.gz"

################################
# 输出头
################################
echo ""
echo "======================================"
echo " 🚀 NAS Frontend Deploy Script"
echo " Host: $NAS_HOST"
echo " Html: $NAS_SSH_DIR/html"
echo " Container: $CONTAINER_NAME"
echo " Time: $TIME"
echo "======================================"
echo ""

################################
# 1. 构建
################################
echo "[1/6] Build frontend..."
npm run build

################################
# 2. 打包
################################
echo "[2/6] Package dist..."
tar --no-xattrs -zcf $PKG_NAME dist

################################
# 3. 上传
################################
echo "[3/6] Upload to NAS..."
scp $PKG_NAME ${NAS_USER}@${NAS_HOST}:${NAS_SCP_DIR}/

################################
# 4. 远程部署（不删目录）
################################
echo "[4/6] Deploy on NAS..."
ssh -tt ${NAS_USER}@${NAS_HOST} << EOF

set -e
cd $NAS_SSH_DIR

echo "Backup old html..."
mkdir -p backup
if [ -d html ]; then
  tar -zcf backup/html_${TIME}.tar.gz html
else
  mkdir html
fi

echo "Clean html files..."
rm -rf html/*

echo "Extract new dist..."
tar -zxf $PKG_NAME -C html --strip-components=1

echo "Clean package..."
rm -f $PKG_NAME

EOF

################################
# 5. 重启容器
################################
echo "[5/6] Restart nginx container..."
ssh -tt ${NAS_USER}@${NAS_HOST} "echo 'Restarting nginx...' && sudo docker restart $CONTAINER_NAME"

################################
# 6. 完成
################################
echo "[6/6] Done ✅"
echo "Deploy finished at: $(date)"
