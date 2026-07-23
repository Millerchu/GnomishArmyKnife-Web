import {createRouter, createWebHistory} from 'vue-router'
import {readAuthState} from '@/utils/authStorage'
import {resolveNavigationTarget} from '@/utils/routeAccess'

const routes = [
    {path: '/', redirect: '/login'}, // 打开直接进入登录页
    {path: '/login', component: () => import('../views/Login.vue')},
    {path: '/register', component: () => import('../views/Register.vue')},
    {path: '/star-interactive', component: () => import('../views/StarInteractive.vue')},
    {path: '/home', component: () => import('../views/Home.vue')},
    {path: '/calculator', component: () => import('../views/Calculator.vue')},
    {path: '/password-memo', component: () => import('../views/PasswordMemo.vue')},
    {path: '/todo-list', component: () => import('../views/TodoList.vue')},
    {path: '/fuel-stats', component: () => import('../views/FuelStats.vue')},
    {path: '/wow-character-stats', component: () => import('../views/WowCharacterStats.vue')},
    {path: '/personal-bills', component: () => import('../views/PersonalBills.vue')},
    {path: '/knowledge-base', component: () => import('../views/KnowledgeBase.vue')},
    {path: '/software-repo', component: () => import('../views/SoftwareRepo.vue')},
    {path: '/health', component: () => import('../views/HealthRecord.vue')},
    {path: '/work-log', component: () => import('../views/WorkLog.vue')},
    {path: '/instrument-practice', component: () => import('../views/InstrumentPractice.vue')},
    {path: '/system/users', component: () => import('../views/UserManagement.vue')},
    {path: '/system/apps', component: () => import('../views/AppManagement.vue')},
    {path: '/system/permissions', component: () => import('../views/PermissionManagement.vue')},
    {path: '/system/data-migrations', component: () => import('../views/DataMigration.vue')},
    {path: '/system/dictionaries', component: () => import('../views/DataDictionary.vue')}
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to) => {
    const redirectPath = resolveNavigationTarget(to.path, readAuthState())
    return redirectPath && redirectPath !== to.path ? redirectPath : true
})

export default router
