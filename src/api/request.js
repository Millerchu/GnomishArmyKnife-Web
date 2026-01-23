const BASE_URL = 'http://localhost:8080' // 后端预留

export async function request(url, options = {}) {
    const res = await fetch(BASE_URL + url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    })

    if (!res.ok) throw new Error('网络错误：' + res.status)

    return res.json()
}

export const post = (url, data) =>
    request(url, {
        method: 'POST',
        body: JSON.stringify(data)
    })
