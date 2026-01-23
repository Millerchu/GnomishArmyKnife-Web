(function () {
    function setRem() {
        const baseSize = 50 // 原来是 37.5，现在放大

        const isPC = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

        if (isPC) {
            document.documentElement.style.fontSize = baseSize + 'px'
            return
        }

        const scale = document.documentElement.clientWidth / 375
        document.documentElement.style.fontSize = baseSize * scale + 'px'
    }

    setRem()
    window.onresize = setRem
})()
