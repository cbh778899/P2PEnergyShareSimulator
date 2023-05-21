function calcTargetPoint(angle, len, end_point, reverse = false) {
    let extend_angle = Math.PI / 10
    if(reverse) extend_angle = -extend_angle

    return {
        x: end_point.x - len * Math.cos(angle + extend_angle),
        y: end_point.y - len * Math.sin(angle + extend_angle)
    }
}

function drawArrow(start, end, ctx, color='black', head_len=10, fill_head = true) {
    
    ctx.strokeStyle = color;
    // straight line
    ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // arrow head
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const p1 = calcTargetPoint(angle, head_len, end)
    const p2 = calcTargetPoint(angle, head_len, end, true)

    ctx.fillStyle = color;
    ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(p2.x, p2.y);
    if(fill_head) ctx.fill();
    else ctx.stroke();
}

function drawBasicTable(ctx, user_type) {
    ctx.clearRect(0, 0, 1000, 610)

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, 1000, 610)

    ctx.fillStyle = 'black'
    ctx.strokeStyle = 'black'

    drawArrow({x: 50, y: 560}, {x:50, y:50}, ctx)
    drawArrow({x: 50, y: 560}, {x: 950, y: 560}, ctx)

    ctx.fillText("0", 45, 575, 10)
    const step = 900 / 24
    for(var i = 1; i < 24; i++) {
        ctx.beginPath()
            ctx.moveTo(i*step + 50, 560)
            ctx.lineTo(i*step + 50, 555)
        ctx.stroke()
        ctx.fillText(i, i*step + 45, 575, 10)
    }
    ctx.fillText("Hour of day", step*23+70, 575, step)

    // legend
    ctx.strokeRect(920, 10, 70, 25 * (user_type === 0 ? 3: 1))
    ctx.strokeStyle = 'red'
    ctx.beginPath()
        ctx.moveTo(925, 23)
        ctx.lineTo(945, 23)
    ctx.stroke()
    ctx.fillText("Con.", 950, 25, 40)
    if(user_type === 0) {
        ctx.strokeStyle = 'blue'
        ctx.beginPath()
            ctx.moveTo(925, 48)
            ctx.lineTo(945, 48)
        ctx.stroke()
        ctx.fillText("Gen.", 950, 50, 40)
        
        ctx.strokeStyle = 'green'
        ctx.beginPath()
            ctx.moveTo(925, 73)
            ctx.lineTo(945, 73)
        ctx.stroke()
        ctx.fillText("Stored", 950, 75, 40)
    }

    ctx.fillText("Energy kW/h", 30, 40, 50)
    return step;
}

function round2(num) {
    const int = parseInt(num)
    return int + (num - int).toPrecision(2).substring(1)
}

function drawOverlay(ctx, superpeers, peers, self) {
    const width = ctx.canvas.clientWidth
    const height = ctx.canvas.clientHeight

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    const main_circle = {x: width/2, y: height/2, r: width/4}
    const circles = []
    const circle_index = {}
    const linked_lines = []
    const superpeer_ids = superpeers.map(e=>e.id)

    const superpeer_circle_r = main_circle.r * 0.3
    const peer_circle_r = main_circle.r * 0.24
    const extend_r = main_circle.r * 0.4

    function checkAvailability(new_circle, exclude_main = false) {
        available = true
        reverse = false
        const all_circles = exclude_main ? circles : [main_circle, ...circles]
        for(var i = 0; i < all_circles.length; i++) {
            const circle = all_circles[i]
            const cross_distance = circle.r + new_circle.r
            if(!reverse) {
                let distance = Math.pow(new_circle.x - circle.x, 2) + Math.pow(new_circle.y - circle.y, 2)
                distance = Math.sqrt(distance)
                if(distance <= cross_distance) {
                    reverse = true
                    distance = Math.pow(new_circle.x - circle.x, 2) + Math.pow(new_circle.reverse_y - circle.y, 2)
                    distance = Math.sqrt(distance)
                    if(distance <= cross_distance) {
                        available = false;
                        break;
                    }
                }
                
            } else {
                let distance = Math.pow(new_circle.x - circle.x, 2) + Math.pow(new_circle.reverse_y - circle.y, 2)
                distance = Math.sqrt(distance)
                if(distance <= cross_distance) {
                    available = false;
                    break;
                }
            }
        }
        return {available: available, reverse_y: reverse}
    }

    function generateCircle(on, radius, exclude_main = false, extend_on_radius = 0) {
        let availability = false
        let new_circle
        const on_radius = on.r + extend_on_radius
        while(!availability.available) {

            let random_x = Math.random() * 2 - 1
            let random_y = Math.sqrt(1 - Math.pow(random_x, 2))
    
            random_x *= on_radius
            random_y *= on_radius

            new_circle = {x: random_x + on.x, y: random_y + on.y, r: radius}
            availability = checkAvailability({...new_circle, reverse_y: on.y - random_y}, exclude_main)
            if(availability.available && availability.reverse_y) {
                new_circle.y = on.y - random_y
            }
        }

        circles.push(new_circle)
    }

    function drawLines() {
        [...superpeers, ...peers].forEach((e, i)=>{
            // this circle
            const circle = circles[circle_index[`${e.type}_${e.id}`]]
            
            // find neighbors: if superpeer, find the superpeer closest to itself, else neighbor is this peer's master
            const neighbors = []
            if(!e.master) {
                neighbors.push(superpeer_ids[i - 1 < 0 ? superpeer_ids.length - 1 : i - 1])
                neighbors.push(superpeer_ids[i + 1 >= superpeer_ids.length ? 0 : i + 1])
            } else {
                neighbors.push(e.master)
            }
            
            // loop for neighbors
            neighbors.forEach(neighbor=>{
                // check if the link already exists
                const line_exist = linked_lines.filter(entry=>
                        entry.start === Math.min(e.id, neighbor) &&
                        entry.end === Math.max(e.id, neighbor)
                    ).length
                
                // if not existed, draw the line and add to history
                if(!line_exist) {
                    const target_circle = circles[circle_index[`0_${neighbor}`]]
                    ctx.beginPath()
                        ctx.moveTo(circle.x, circle.y)
                        ctx.lineTo(target_circle.x, target_circle.y)
                    ctx.stroke()

                    linked_lines.push({start: Math.min(e.id, neighbor), end: Math.max(e.id, neighbor)})
                }
            })
        })
    }

    function drawCircles() {
        [...superpeers, ...peers].forEach(e=>{
            const circle = circles[circle_index[`${e.type}_${e.id}`]]
            ctx.fillStyle = (e.id === self.id && e.type === self.type) ? 'blue' : 'white'
            ctx.strokeStyle = (e.id === self.id && e.type === self.type) ? 'blue' : 'black'
            ctx.font = '20px Arial'

            ctx.beginPath()
                ctx.arc(circle.x, circle.y, circle.r, 0, 2*Math.PI)
            ctx.stroke()

            ctx.beginPath()
                ctx.arc(circle.x, circle.y, circle.r, 0, 2*Math.PI)
            ctx.fill()

            ctx.fillStyle = (e.id === self.id && e.type === self.type) ? 'white' : 'black'
            ctx.fillText(`${!e.master ? 'S' : 'P'}${e.id}`, circle.x - 10, circle.y + 10, 20)
        })
    }

    // generate circles
    [...superpeers, ...peers].forEach((e, i)=>{
        const is_superpeer = !e.master

        generateCircle(
            is_superpeer ? main_circle : circles[circle_index[`0_${e.master}`]],
            is_superpeer ? superpeer_circle_r : peer_circle_r,
            is_superpeer,
            is_superpeer ? 0 : extend_r
        )

        circle_index[`${e.type}_${e.id}`] = i
    })

    drawLines()
    drawCircles()
}

function drawFlowChart(ctx, superpeers, peers, self) {
    const width = ctx.canvas.clientWidth - 20
    const step = width / (superpeers.length + peers.filter(e=>e.type===0 || (e.type === self.type && e.id === self.id)).length)
    const step_center = step / 2
    let column_index = 0

    const vertical_step = 30

    const position_list = {}

    function drawColumns(x, text, height, is_self) {
        ctx.font = '30px Arial'
        ctx.fillStyle = is_self ? 'orange' : 'black'
        ctx.fillText(text, x - 15, 40, step - 10)
        
        drawArrow({x: x, y: 50}, {x: x, y: 50 + height}, ctx, is_self ? 'orange' : 'black')
    }

    // get superpeer neighbors
    superpeers.forEach((e, i) => {
        e.neighbors = []
        e.neighbors.push(superpeers[i - 1 < 0 ? superpeers.length - 1 : i - 1])
        e.neighbors.push(superpeers[i + 1 >= superpeers.length ? 0 : i + 1])
    })


    // get all x coordinate
    superpeers.forEach(e=>{
        position_list[e.id] = {}
        child_peers = peers.filter(peer=>peer.master === e.id)
        child_peers.forEach(peer=>{
            if(peer.type===0 || (peer.type === self.type && peer.id === self.id)) {
                const start_x = step * column_index
                position_list[e.id][peer.id] = {
                    x: start_x + step_center,
                    title: `P${peer.id}`
                }
                column_index ++

                if(self.type === peer.type && self.id === peer.id) {
                    self.master = e.id
                }
            }
        })
        const start_x = step * column_index
        position_list[e.id].x = start_x + step_center
        position_list[e.id].title = `S${e.id}`
        position_list[e.id].peers = child_peers
        column_index ++
    })

    const queries = {
        sequence: [],
        received: {}
    }

    function calculateQueries(node, to_y = 0) {
        let y = to_y;
        let last_y = y
        if(node.master && !queries.received[node.master]) {
            const x = position_list[node.master][node.id].x
            const master_x = position_list[node.master].x

            queries.sequence.push({from: x, to: master_x, type: 'query', y: y})
            queries.received[node.master] = true
            const queryhit_y = calculateQueries(superpeers.filter(e=>e.id === node.master)[0], y + vertical_step)
            queries.sequence.push({from: master_x, to: x, type: 'queryhit', y: queryhit_y})
            last_y = Math.max(last_y, queryhit_y + vertical_step)
        } else if(!node.master) {
            const waiting_for_query = [];

            [...node.neighbors, ...position_list[node.id].peers].forEach(e=>{
                if(!queries.received[e.id] && !(e.id === self.id && e.type === self.type) && e.type === 0) {
                    const x = position_list[node.id].x
                    const target_x = e.master ? position_list[e.master][e.id].x : position_list[e.id].x
                    y += vertical_step
                    queries.sequence.push({from: x, to: target_x, type: 'query', y: y})
                    queries.received[e.id] = true
                    waiting_for_query.push({node: e, y: y + vertical_step, target_x, x})
                }
            })

            waiting_for_query.forEach(e=>{
                const queryhit_y = calculateQueries(e.node, e.y)
                queries.sequence.push({from: e.target_x, to: e.x, type: 'queryhit', y: queryhit_y})
                last_y = Math.max(last_y, queryhit_y + vertical_step)
            })

        }
        return last_y + vertical_step / 2
    }

    const max_height = calculateQueries(self) + 20

    superpeers.forEach(superpeer=>{
        position_list[superpeer.id].peers.forEach(peer=>{
            if(peer.type === 0 || (peer.id === self.id && peer.type === self.type)) {
                drawColumns(
                    position_list[superpeer.id][peer.id].x,
                    position_list[superpeer.id][peer.id].title,
                    max_height,
                    (peer.id === self.id && peer.type === self.type)
                )
            }
        })
        drawColumns(
            position_list[superpeer.id].x,
            position_list[superpeer.id].title,
            max_height,
            (superpeer.id === self.id && superpeer.type === self.type)
        )
    })
    
    // draw queries
    queries.sequence.forEach(e=>{
        drawArrow(
            {x: e.from, y: 60 + e.y},
            {x: e.to, y: 60 + e.y + vertical_step},
            ctx,
            e.type === 'query' ? 'blue' : 'green'
        )
    })
}