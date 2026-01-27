#!/bin/bash
set -e

########################
# 基础配置
########################
NAS_USER="millerchu"
NAS_HOST="greennas"

NAS_SCP_DIR="/Projects/GAK-Web"
NAS_SSH_DIR="/volume1/Projects/GAK-Web"

HTML_DIR="$NAS_SSH_DIR/html"
CONTAINER_NAME="my-nginx"

TIME=$(date +"%Y%m%d_%H%M%S")
PKG_NAME="dist_${TIME}.tar.gz"
REMOTE_SCRIPT="deploy_${TIME}.sh"

########################
# Banner
########################
echo ""
echo "======================================"
echo " 🚀 NAS Frontend Deploy Script"
echo " Host      : $NAS_HOST"
echo " Html Path : $HTML_DIR"
echo " Container : $CONTAINER_NAME"
echo " Time      : $TIME"
echo "======================================"
echo ""

########################
# 1. Build
########################
echo "[1/6] Build frontend..."
npm run build

########################
# 2. Package
########################
echo "[2/6] Package dist..."
tar --no-xattrs -zcf "$PKG_NAME" dist

########################
# 3. Upload dist
########################
echo "[3/6] Upload to NAS..."
scp "$PKG_NAME" "${NAS_USER}@${NAS_HOST}:${NAS_SCP_DIR}/"

echo "[3.1/6] Clean local package..."
rm -f "$PKG_NAME"

########################
# 4. Generate remote deploy script
########################
cat > "$REMOTE_SCRIPT" << EOF
#!/bin/sh
set -e

cd "$NAS_SSH_DIR"

echo "Backup old html..."
mkdir -p backup
if [ -d html ]; then
  tar -zcf backup/html_${TIME}.tar.gz html
else
  mkdir -p html
fi

echo "Clean html files..."
rm -rf html/*

echo "Extract new dist..."
tar -zxf "$PKG_NAME" -C html --strip-components=1

echo "Clean package..."
rm -f "$PKG_NAME"

echo "Restart nginx..."
sudo docker restart "$CONTAINER_NAME"

echo "Deploy success."
EOF

chmod +x "$REMOTE_SCRIPT"

########################
# 5. Upload & execute remote script
########################
echo "[4/6] Upload remote deploy script..."
scp "$REMOTE_SCRIPT" "${NAS_USER}@${NAS_HOST}:${NAS_SCP_DIR}/"

echo "[5/6] Execute deploy on NAS..."
ssh -tt "${NAS_USER}@${NAS_HOST}" "cd $NAS_SSH_DIR && chmod +x $REMOTE_SCRIPT && ./$REMOTE_SCRIPT"

########################
# 6. Clean local
########################
echo "[6/6] Clean local temp files..."
rm -f "$REMOTE_SCRIPT"

echo ""
echo "🎉 Deploy finished successfully!"
echo "======================================"
