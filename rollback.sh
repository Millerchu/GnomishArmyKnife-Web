#!/bin/bash

NAS_USER="millerchu"
NAS_HOST="greennas"

NAS_HTML_DIR="/共享文件夹/docker/nginx/html"
BACKUP_BASE="/共享文件夹/docker/nginx/backup"

echo "📦 Available backups:"
ssh ${NAS_USER}@${NAS_HOST} "ls ${BACKUP_BASE}"

echo ""
read -p "👉 Input backup folder name: " VERSION

ssh ${NAS_USER}@${NAS_HOST} "rm -rf ${NAS_HTML_DIR}/* && cp -r ${BACKUP_BASE}/${VERSION}/* ${NAS_HTML_DIR}/ && chmod -R 755 ${NAS_HTML_DIR}"

ssh ${NAS_USER}@${NAS_HOST} "docker restart my-nginx"

echo "✅ Rollback finished"
