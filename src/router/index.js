import {createRouter, createWebHistory} from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'
import WorkLog from '../views/WorkLog.vue'
import UserManagement from '../views/UserManagement.vue'
import PermissionManagement from '../views/PermissionManagement.vue'
import StarInteractive from '../views/StarInteractive.vue'
import DataDictionary from '../views/DataDictionary.vue'
import Calculator from '../views/Calculator.vue'
import PasswordMemo from '../views/PasswordMemo.vue'
import TodoList from '../views/TodoList.vue'
import FuelStats from '../views/FuelStats.vue'
import WowCharacterStats from '../views/WowCharacterStats.vue'
import PersonalBills from '../views/PersonalBills.vue'
import SoftwareRepo from '../views/SoftwareRepo.vue'
import HealthRecord from '../views/HealthRecord.vue'
import KnowledgeBase from '../views/KnowledgeBase.vue'

const routes = [
    {path: '/', redirect: '/login'}, // 打开直接进入登录页
    {path: '/login', component: Login},
    {path: '/register', component: Register},
    {path: '/star-interactive', component: StarInteractive},
    {path: '/home', component: Home},
    {path: '/calculator', component: Calculator},
    {path: '/password-memo', component: PasswordMemo},
    {path: '/todo-list', component: TodoList},
    {path: '/fuel-stats', component: FuelStats},
    {path: '/wow-character-stats', component: WowCharacterStats},
    {path: '/personal-bills', component: PersonalBills},
    {path: '/knowledge-base', component: KnowledgeBase},
    {path: '/software-repo', component: SoftwareRepo},
    {path: '/health', component: HealthRecord},
    {path: '/work-log', component: WorkLog},
    {path: '/system/users', component: UserManagement},
    {path: '/system/permissions', component: PermissionManagement},
    {path: '/system/dictionaries', component: DataDictionary}
]

export default createRouter({
    history: createWebHistory(),
    routes
})
