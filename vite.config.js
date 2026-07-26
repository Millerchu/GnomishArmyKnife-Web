import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'
    const appBasePath = env.VITE_APP_BASE_PATH || (mode === 'production' ? '/gak/' : '/')

    return {
        base: appBasePath,
        plugins: [vue()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src')
            }
        },
        server: {
            proxy: {
                [`${appBasePath.replace(/\/$/u, '')}/api`]: {
                    target: apiProxyTarget,
                    changeOrigin: true,
                    rewrite: requestPath => requestPath.replace(
                        new RegExp(`^${appBasePath.replace(/\/$/u, '')}/api`),
                        ''
                    )
                }
            }
        }
    }
})
