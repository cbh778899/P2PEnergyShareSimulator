const SUPPLY_CHARGE = 120
const USAGE_CHARGE = 20
const P2P_CHARGE = 15
let interval = undefined

const landing_menu = [
    {
        name: 'Account',
        sub: [
            {
                name: 'Sign In',
                exec: signInPage
            },
            {
                name: 'Sign Up',
                exec: signUpPage
            }
        ]
    },
    {
        name: 'About',
        sub: [
            {
                name: 'Author: <br>lililele | cbh778899@outlook.com',
                append_class: 'read-only-info'
            },
            {
                name: 'Dummy Users',
                exec: ()=>{
                    request('POST', '/dummy-users', res=>{
                        landing_menu[1].sub = [landing_menu[1].sub[0]]
                        generateMenu(landing_menu)
                    })
                }
            }
        ]
    }
]

function request(method, url, callback, body = undefined) {
    const XHR = new XMLHttpRequest()
    XHR.open(method, url)
    XHR.setRequestHeader('Content-Type', 'application/json')
    XHR.responseType = 'json'
    XHR.onreadystatechange = () => {
        if(XHR.readyState === 4 && XHR.status === 200) {
            callback(XHR.response)
        }
    }
    if(body) body = JSON.stringify(body)
    XHR.send(body)
}

function generateMenu(menus) {
    const menu_bar = document.getElementById("top-nav-bar")
    menu_bar.innerHTML = ''
    menus.forEach((e, i)=>{
        menu_bar.insertAdjacentHTML("beforeend", 
        `<div class='menu-item' id='menu-item-${i}'>
            <span>${e.name}</span>${e.sub ? 
            `<div class='sub-menu'>
            ${e.sub.map((sub_menu, sub_index)=>{
                return (
                    `<div class='menu-item${sub_menu.append_class ? ` ${sub_menu.append_class}` : ''
                }' id='sub-menu-item-${i}-${sub_index}'>
                        ${sub_index===0 ? '<div class="arrow-sign"></div>' : ''
                        }<span>${sub_menu.name}</span>
                    </div>
                    `
                )
            }).join('')}
            </div>` : ''}
        </div>`)
        if(e.exec) {
            document.getElementById(`menu-item-${i}`).onclick = e.exec
        } else if(e.sub) {
            e.sub.forEach((sub_menu, sub_index)=>{
                if(sub_menu.exec) {
                    document.getElementById(`sub-menu-item-${i}-${sub_index}`)
                    .onclick = sub_menu.exec
                }
            })
        }
        
    })
}

function signInPage() {
    document.getElementById('main-panel').innerHTML = 
    `<form id='sign-in-form' class='account-form'>
        <span class='title'>Please select your account type</span>
        <div class='user-type-radio'>
            <input type='radio' name='user_type' value='0' checked>
            <div>Prosumer</div>
        </div>
        <div class='user-type-radio'>
            <input type='radio' name='user_type' value='1'>
            <div>Consumer</div>
        </div>
        <span class='title'>Username or Email</span>
        <input class='input-area' type='text' name='username'>
        <span class='title'>Password</span>
        <input class='input-area' type='password' name='password'>
        <button type='submit'>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
            </svg>
        </button>
        <span class='error' name='error_msg'></span>
    </form>
    `

    document.getElementById("sign-in-form").onsubmit = event => {
        event.preventDefault();
        
        const user_type = parseInt(event.target.user_type.value);
        const username = event.target.username.value;
        const password = event.target.password.value;

        let got_error = false
        if(!username) {
            event.target.username.classList.add('invalid')
            event.target.username.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }
        if(!password) {
            event.target.password.classList.add('invalid')
            event.target.password.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }

        if(!got_error) {
            request('POST', '/login', res=>{
                if(!res.login_failed) {
                    afterLogin(res.user_id, user_type)
                } else if(error_msg) {
                    event.target.error_msg.textContent = 'Username or password incorrect!';
                }
            }, {user_type: user_type, username: username, password: password})
        }
    }
}

function signUpPage() {
    document.getElementById('main-panel').innerHTML = 
    `<form id='signup-form' class='account-form'>
        <span class='title'>Please select an account type</span>
        <div class='user-type-radio'>
            <input type='radio' name='user_type' value='0' checked>
            <div>Prosumer</div>
        </div>
        <div class='user-type-radio'>
            <input type='radio' name='user_type' value='1'>
            <div>Consumer</div>
        </div>
        <span class='title'>Please select your area</span>
        <select name='area'>
            <option value='NOT_SELECTED' selected>-- Please select your area --</option>
            <option value='Area 1'>Area 1</option>
            <option value='Area 2'>Area 2</option>
            <option value='Area 3'>Area 3</option>
            <option value='Area 4'>Area 4</option>
        </select>
        <span class='title'>Username</span>
        <input class='input-area' type='text' name='username'>
        <span class='title'>Email</span>
        <input class='input-area' type='text' name='email'>
        <span class='title'>Password</span>
        <input class='input-area' type='password' name='password'>
        <span class='title'>Confirm Password</span>
        <input class='input-area' type='password' name='confirm_password'>
        <button type='submit'>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
            </svg>
        </button>
    </form>
    `

    document.getElementById("signup-form").onsubmit = event => {
        function invalidFieldOnChange(event) {
            event.target.classList.remove('invalid')
        }

        event.preventDefault();

        const user_type = parseInt(event.target.user_type.value)
        const area = event.target.area.value
        const username = event.target.username.value
        const email = event.target.email.value
        const password = event.target.password.value
        const confirm_password = event.target.confirm_password.value

        let got_error = false
        
        if(area === 'NOT_SELECTED') {
            event.target.area.classList.add('invalid')
            event.target.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }
        if(!username) {
            event.target.username.classList.add('invalid')
            event.target.username.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }
        if(!email || !/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(email)) {
            event.target.email.classList.add('invalid')
            event.target.email.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }
        if(!password) {
            event.target.password.classList.add('invalid')
            event.target.password.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }
        if(!confirm_password || password !== confirm_password) {
            event.target.confirm_password.classList.add('invalid')
            event.target.confirm_password.addEventListener("change", 
                invalidFieldOnChange, {once: true})
            got_error = true
        }

        if(!got_error) {
            request("POST", '/new-user', res=>{
                afterLogin(res.user_id, user_type)
            }, {user_type: user_type, username: username, 
                email: email, password: password, 
                area: area})
        }
    }
    
}

function afterLogin(user_id, user_type) {
    request("GET", `/basic-user-info/${user_type}/${user_id}`, res=>{
        generateMenu([
            {
                name: 'Account',
                sub: [
                    {
                        name: `${res.username}<br>${res.email}<br>Area: ${res.area}`,
                        append_class: 'read-only-info'
                    },
                    {
                        name: 'Sign Out',
                        exec: ()=>{
                            if(interval) {
                                clearInterval(interval)
                                interval = undefined
                            }
                            generateMenu(landing_menu)
                            signInPage()
                        }
                    }
                ]
            },
            {
                name: 'My Energy',
                sub: [
                    {
                        name: 'Energy Summary',
                        exec: ()=>userHome(user_id, user_type)
                    },
                    {
                        name: 'My Billing',
                        exec: ()=>billingPage(user_id, user_type)
                    }
                ]
            }
        ])

        userHome(user_id, user_type)
    })
}

function userHome(user_id, user_type) {
    document.getElementById('main-panel').innerHTML = 
    `<canvas width='1000' height='610' id='trend-canvas'></canvas>
    <div id='power-summary'></div>`

    const canvas = document.getElementById('trend-canvas')
    const ctx = canvas.getContext('2d')

    const step = drawBasicTable(ctx, user_type)

    function getUpdate() {
        request("GET", `/energy-summary/${user_type}/${user_id}`, res=>{
            if(res.no_record) {

            } else {
                drawBasicTable(ctx, user_type)
                ctx.strokeStyle = 'black'
                ctx.fillStyle = 'black'
                for(var i = 1; i < 10; i++) {
                    ctx.beginPath()
                        ctx.moveTo(50, 560 - (i*51))
                        ctx.lineTo(55, 560 - (i*51))
                    ctx.stroke()
                    ctx.fillText(i/10, 25, 565 - (i*51), 20)
                }
                ctx.strokeStyle = 'red'
                ctx.beginPath()
                res.last_24_hours.forEach((e, i) => {
                    const time_of_day = e.report_time % 24
                    if(i === 0 || time_of_day === 0)
                        ctx.moveTo(time_of_day * step + 50, 560 - (e.consumption* 510))
                    else
                        ctx.lineTo(time_of_day * step + 50, 560 - (e.consumption* 510))
                    if(i === res.last_24_hours.length - 1 && 
                        (res.last_24_hours[0].report_time % 24) !== 0 &&
                        res.last_24_hours.length === 24) {
                        ctx.lineTo((res.last_24_hours[0].report_time % 24) * step + 50, 560 - (res.last_24_hours[0].consumption * 510))
                    }
                })
                ctx.stroke()

                if(user_type === 0) {
                    ctx.strokeStyle = 'blue'
                    ctx.beginPath()
                    res.last_24_hours.forEach((e, i) => {
                        const time_of_day = e.report_time % 24
                        if(i === 0 || time_of_day === 0)
                            ctx.moveTo(time_of_day * step + 50, 560 - (e.generation* 510))
                        else
                            ctx.lineTo(time_of_day * step + 50, 560 - (e.generation* 510))
                        if(i === res.last_24_hours.length - 1 && 
                        (res.last_24_hours[0].report_time % 24) !== 0 &&
                        res.last_24_hours.length === 24) {
                            ctx.lineTo((res.last_24_hours[0].report_time % 24) * step + 50, 560 - (res.last_24_hours[0].generation * 510))
                        }
                    })
                    ctx.stroke()

                    ctx.strokeStyle = 'green'
                    ctx.beginPath()
                    res.last_24_hours.forEach((e, i) => {
                        const time_of_day = e.report_time % 24
                        if(i === 0 || time_of_day === 0)
                            ctx.moveTo(time_of_day * step + 50, 560 - (e.stored* 510))
                        else
                            ctx.lineTo(time_of_day * step + 50, 560 - (e.stored* 510))
                        if(i === res.last_24_hours.length - 1 && 
                        (res.last_24_hours[0].report_time % 24) !== 0 &&
                        res.last_24_hours.length === 24) {
                            ctx.lineTo((res.last_24_hours[0].report_time % 24) * step + 50, 560 - (res.last_24_hours[0].stored * 510))
                        }
                    })
                    ctx.stroke()
                }
            }

            const energy_summary_div = document.getElementById("power-summary")
            energy_summary_div.innerHTML =  
            `<span class='title'>My Energy Summary</span>
            <span>Total Consumption: ${res.total_consumption} kW/h</span>
            <span>Last 24 hours Consumption: ${res.period_consumption} kW/h</span>
            ${user_type === 0 ? 
            `<span>Total Consumption: ${res.total_generation} kW/h</span>
            <span>Last 24 hours Consumption: ${res.period_generation} kW/h</span>
            <span>Battery Max Capacity: ${res.battery_status.max_capacity} kW/h</span>
            <span>Battery Used Capacity: ${res.battery_status.used_capacity} kW/h</span>
            <span>Current Battery Status: ${res.battery_status.state ? 'Charging' : 'Discharged'}</span>
            <span>Last Report Time: ${res.last_24_hours[res.last_24_hours.length - 1].report_time % 24}:00</span>
            ` : ''}
            `
        })
    }

    getUpdate()
    if(interval)
        clearInterval(interval)
    interval = setInterval(getUpdate, 1000);
}

function billingPage(user_id, user_type) {
    document.getElementById('main-panel').innerHTML = '<div id="billing-main"></div>' 

    function update() {
        request("GET", `/billing/${user_type}/${user_id}`, res=>{
            if(user_type === 0) {
                document.getElementById("billing-main").innerHTML =
                `<span class='title'>Total Saved</span>
                <span class='description'>Grid supply charge ${SUPPLY_CHARGE}c/Day * ${res.days} Days +</span>
                <span class='description'>Grid usage charge ${USAGE_CHARGE}c/kWh * ${res.usage} kW/h =<span>
                <span class='bill'>$ ${round2((SUPPLY_CHARGE*res.days + USAGE_CHARGE*res.usage) / 100)}</span>
                <span class='title'>Total Earned</span>
                <span class='description'>P2P sold energy ${res.sold} kW/h * charge ${P2P_CHARGE}/kWh =</span>
                <span class='bill'>$ ${round2((P2P_CHARGE*res.sold) / 100)}</span>
                <span class='question' onclick="describePage(${user_id}, ${user_type})">How my batteries connected to this community?</span>
                `
            } else {
                document.getElementById("billing-main").innerHTML =
                `<span class='title'>Total Spent</span>
                <span class='description'>Grid supply charge ${SUPPLY_CHARGE}c/Day * ${res.grid_days} Days +</span>
                <span class='description'>Grid usage charge ${USAGE_CHARGE}c/kWh * ${res.grid_usage} kW/h +<span>
                <span class='description'>P2P energy consumption ${res.usage} kW/h * charge ${P2P_CHARGE}c/kWh =</span>
                <span class='bill'>$ ${round2(((SUPPLY_CHARGE*res.grid_days + USAGE_CHARGE*res.grid_usage) + (P2P_CHARGE*res.usage)) / 100)}</span>
                <span class='question' onclick="describePage(${user_id}, ${user_type})">How did I connected to others' battery in this community?</span>
                `
            }
        })
    }

    update()
    if(interval)
        clearInterval(interval)
    interval = setInterval(update, 1000);
}

function describePage(user_id, user_type) {
    if(interval) {
        clearInterval(interval)
        interval = undefined
    }

    const overlay_div = 
    `<div class='overlay-div'>
        <canvas id='overlay-canvas' width='500' height='500'></canvas>
        <span class='description'>This is the graph describes where you are in this network.</span>
        <span class='description'>The <span style='color: blue;'>blue</span> node represents you.</span>
        <span class='description'>The nodes starts with 'S' means they are superpeers.</span>
        <span class='description'>The nodes starts with 'P' means they are normal peers.</span>
        ${user_type === 0 ? 
        `<span class='description'>Your battery now can receive/response your superpeer's query<br>
        and will connect to other consumers for their power supplies in need,
        in the meantime, earn some pocket money from it.</span>` : ``}
    </div>`

    const flowchart_div = 
    `<div class='flowchart-div'>
        <canvas id='flowchart-canvas' width='500' height='600'></canvas>
        <div class='description-div'>
            <span class='description'>This flowchart shows how the system pick up the best battery for you.</span>
            <span class='description'>You are the <span style='color: orange;'>orange</span> column in this chart.</span>
            <span class='description'>The <span style='color: blue;'>blue</span> lines means Queries,</span>
            <span class='description'>And the <span style='color: green;'>green</span> lines means QueryHits.</span>
            <span class='description'>You are a common peer, which means you should send query to your superpeer asking which battery is the best one.</span>
            <span class='description'>Your superpeer will forward to its neighbors, and this will be forwarded further until all superpeers received this query or TTL ends.</span>
            <span class='description'>Each superpeer will query their child peers so that they can find the battery matches the best (in this case, with the most energy stored) includes themselves.</span>
            <span class='description'>Your superpeer will gather and compare all information and send the QueryHit to you, then you can connect to the selected battery through the system directly.</span>
        </div>
    </div>`

    document.getElementById('main-panel').innerHTML = 
    `${overlay_div}
    ${user_type === 1 ? flowchart_div : ''}
    `

    const overlay_ctx = document.getElementById("overlay-canvas").getContext('2d')

    request("GET", '/overlay-peers', res=>{
        drawOverlay(overlay_ctx, res.superpeers, res.peers, {id: user_id, type: user_type})
        if(user_type === 1) {
            const flowchart_ctx = document.getElementById('flowchart-canvas').getContext('2d')
            drawFlowChart(flowchart_ctx, res.superpeers, res.peers, {id: user_id, type: user_type})
        }
    })
}

window.onload = () => {
    generateMenu(landing_menu)
    signInPage()
}