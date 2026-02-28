import {createRouter, createWebHistory} from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'
import WorkLog from '../views/WorkLog.vue'

const routes = [
    {path: '/', redirect: '/login'}, // 打开直接进入登录页
    {path: '/login', component: Login},
    {path: '/register', component: Register},
    {path: '/home', component: Home},
    {path: '/work-log', component: WorkLog}
]

export default createRouter({
    history: createWebHistory(),
    routes
})
