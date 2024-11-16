const {
    PrismaClient
} = require('@prisma/client');
const {
    tr,
    fi,
    da
} = require('date-fns/locale');
const {
    json
} = require('express');
const prisma = new PrismaClient();
const fs = require('fs');
let indent = `    `


async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

const DatabaseFunctions = {
    check_player: async function (puuid) {
        const players = await prisma.players.findMany();
        for (player in players) {
            if (puuid == players[player].puuid) {
                return [true, players[player].id]
            }
        }
        return [false, null]
    },
    get_mass_player: async function () {
        const players = await prisma.players.findMany();
        return players
    },
    create_player: async function (puuid) {
        const createPlayer = prisma.players.create({
            data: {
                puuid
            }
        })
        return createPlayer
    },
    get_Player_Matches: async function (pid, puuid) {
        if (puuid) {
            const p = await prisma.players.findMany({
                where: {
                    puuid
                }
            })
            const playerMatches = await prisma.players_matches.findMany({
                where: {
                    player_id: p[0].id
                }
            })
            return playerMatches
        }
        if (pid) {
            const playerMatches = await prisma.players_matches.findMany({
                where: {
                    player_id: pid
                }
            })
            return playerMatches
        }
    },
    get_Player_Act_Matches: async function (pid, act) {
        const playerMatches = await prisma.playerMatchesWithAct.findMany({
            where: {
                player_id: pid,
                act_id: act
            }
        })
        return playerMatches
    },
    get_mass_Player_Matches: async function () {
        const playerMatches = await prisma.players_matches.findMany()
        return playerMatches
    },
    add_Player_Matches: async function (data) {
        const playerMatches = await prisma.players_matches.createMany({
            data,
            skipDuplicates: true
        })
    },
    mark_adjust: async function (id) {
        const update = await prisma.matches.update({
            where: {
                match_id: id
            },
            data: {
                adjusted: 1
            }
        })
    },
    get_matches_by_pid: async function (pid, act) {
        if (act) {
            const playerMatches = await DatabaseFunctions.get_Player_Matches(pid)
            let ids = []
            for (pmatch in playerMatches) {
                ids.push(playerMatches[pmatch].matchid)
            }
            const matches = await prisma.matches.findMany({
                where: {
                    match_id: {
                        in: ids
                    },
                    act_id: act
                }
            })
            return matches
        } else {

            let mStart = Date.now()
            const playerMatches = await DatabaseFunctions.get_Player_Matches(pid)
            let ids = []
            end = Date.now()
            // console.log(indent + `1 (${Math.round(((end - mStart) / 1000) * 10) / 10}s)`)
            mStart = Date.now()
            for (pmatch in playerMatches) {
                ids.push(playerMatches[pmatch].matchid)
            }
            end = Date.now()
            // console.log(indent + `2 (${Math.round(((end - mStart) / 1000) * 10) / 10}s)`)
            mStart = Date.now()
            const matches = await prisma.matches.findMany({
                where: {
                    match_id: {
                        in: ids
                    }
                }
            })
            end = Date.now()
            // console.log(indent + `3 (${Math.round(((end - mStart) / 1000) * 10) / 10}s)`)
            return matches
        }
    },
    get_match_by_match_id: async function (mid) {
        const match = await prisma.matches.findUnique({
            where: {
                match_id: mid
            }
        })
        return match
    },
    mass_add: async function (matches, unfiltered_matches, pid) {
        try {
            let matchinput = []
            for (match in matches) {
                matchinput.push({
                    match_id: matches[match]['data']['metadata']['matchid'],
                    match_info: JSON.stringify(matches[match]),
                    match_type: matches[match]['data']['metadata']['mode_id'],
                    match_map: matches[match]['data']['metadata']['map'],
                    match_starttime: matches[match]['data']['metadata']['game_start'],
                    act_id: matches[match]['data']['metadata']['season_id']
                })
            }
            const newMatches = await prisma.matches.createMany({
                data: matchinput,
                skipDuplicates: true
            })
        } catch (error) {
            console.error('Error creating matches:', error);
        }
        if (pid) {
            try {
                let userinput = []
                for (match in unfiltered_matches) {
                    userinput.push({
                        player_id: pid,
                        matchid: unfiltered_matches[match],
                    })
                }
                // createJSON('userinput',userinput)
                const newPlayersMatches = await prisma.players_matches.createMany({
                    data: userinput,
                    skipDuplicates: true
                })
            } catch (error) {
                console.error('Error creating player-matches:', error);
            }
        }


    },
    mass_retrieve: async function () {
        const totalMatches = await prisma.matches.count({
            where: {
                adjusted: 0
            }
        });
        let iter = Math.ceil(totalMatches / 100)
        let s = 0
        let all_matches = []
        for (let step = 0; step < iter; step++) {
            const iter_matches = await prisma.matches.findMany({
                skip: s,
                take: 100,
                where: {
                    adjusted: 0
                }
            })
            all_matches = all_matches.concat(iter_matches)
            console.log(`retrieved ${iter_matches.length} matches, total: ${all_matches.length}`)
            s += 100
        }



        // await createJSON('mass_retrieve.json',all_matches)
        return all_matches
    },
    mass_retrieve_comp: async function (id) {
        if (id) {
            let start = Date.now()
            const totalMatches = await prisma.matches.count({
                where: {
                    match_type: 'competitive',
                    act_id: id
                }
            })
            let iter = Math.ceil(totalMatches / 300)
            let s = 0
            let raw_matches = []
            for (let step = 0; step < iter; step++) {
                const iter_matches = await prisma.matches.findMany({
                    skip: s,
                    take: 300,
                    where: {
                        match_type: 'competitive',
                        act_id: id
                    },
                    select: {
                        match_info: true
                    }
                })
                raw_matches.push(...iter_matches);

                // console.log(`retrieved ${iter_matches.length} matches, total: ${all_matches.length}`)
                s += 300
            }



            let end = Date.now()
            // console.log(`Retrieved comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            start = Date.now()
            let matches = []
            for (m in raw_matches) {
                matches.push(JSON.parse(raw_matches[m]['match_info']))
            }
            end = Date.now()
            // console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            return matches
        } else {
            let start = Date.now()
            let og = Date.now()
            const totalMatches = await prisma.matches.count({
                where: {
                    match_type: 'competitive'
                }
            })
            let end = Date.now()
            console.log(`Retrieved comp match count (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            iterTake = 100
            let iter = Math.ceil(totalMatches / iterTake)
            let s = 0
            let raw_matches = []
            for (let step = 0; step < iter; step++) {
                start = Date.now()
                const iter_matches = await prisma.matches.findMany({
                    skip: s,
                    take: iterTake,
                    where: {
                        match_type: 'competitive'
                    },
                    select: {
                        match_info: true
                    }
                })
                raw_matches.push(...iter_matches);
                s += iterTake
                end = Date.now()
                console.log(indent+`retrieved ${Math.round((raw_matches.length/totalMatches)*1000)/10}% matches, total: ${raw_matches.length}/${totalMatches} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            }



            end = Date.now()
            console.log(`Retrieved comp matches (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
            start = Date.now()
            let matches = []
            while (raw_matches.length > 0) {
                const item = raw_matches.shift();  // Remove the first item from raw_matches
                matches.push(JSON.parse(item['match_info']));
            }
            end = Date.now()
            // console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            return matches
        }
    },
    getCompMatchNum: async function () {
        const totalMatches = await prisma.matches.count({
            where: {
                match_type: 'competitive'
            }
        })
        return totalMatches
    },
    fix_act_ids: async function () {
        if (true) { } else {
            const matches = await this.mass_retrieve()
            for (m in matches) {
                let data = JSON.parse(matches[m]['match_info'])
                const updateMatches = await prisma.matches.update({
                    where: {
                        match_id: matches[m].match_id
                    },
                    data: {
                        act_id: data['data']['metadata']['season_id']
                    }
                })

            }
        }
    },
    get_act_comp_matches: async function (act) {
        let start = Date.now()
        const raw_matches = await prisma.matches.findMany({
            where: {
                match_type: 'competitive',
                act_id: act
            },
            select: {
                match_info: true
            }
        })
        let end = Date.now()
        // console.log(`Retrieved comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        start = Date.now()
        let matches = []
        for (m in raw_matches) {
            matches.push(JSON.parse(raw_matches[m]['match_info']))
        }
        end = Date.now()
        // console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        return matches
    },
    get_old_match_ids: async function () {
        const all_matches = await prisma.matches.findMany({
            select: {
                match_id: true
            }
        })



        // await createJSON('mass_retrieve.json',all_matches)
        return all_matches
    },
    getAgentData: async function (agentName, actId) {
        if (actId) {
            const aData = await prisma.agents.findMany({
                where: {
                    name: agentName,
                    act: actId
                },
                select: {
                    data: true
                }
            })
            for (let d of aData) {
                return JSON.parse(d.data)
            }
        } else {
            let result = []
            const aData = await prisma.agents.findMany({
                where: {
                    name: agentName
                },
                select: {
                    data: true
                }
            })
            for (let d of aData) {
                result.push(JSON.parse(d.data))
            }
            return result
        }
    },
    initAgentData: async function (name, data, act) {
        const agent = await prisma.agents.create({
            data: {
                name,
                data,
                act
            }
        })
        return
    },
    updateAgentData: async function (matches, Eps, get_agent_stats) {
        let agentList = [
            "Phoenix",
            "Raze",
            "Jett",
            "Yoru",
            "Neon",
            "Reyna",
            "Sage",
            "Cypher",
            "Chamber",
            "Killjoy",
            "Omen",
            "Viper",
            "Brimstone",
            "Astra",
            "Harbor",
            "Sova",
            "Breach",
            "Skye",
            "KAY/O",
            "Fade",
            "Clove",
            "Gekko",
            "Iso",
            "Deadlock",
            "Vyse"
        ]
        console.log('UPDATING AGENT DATA')
        let start = Date.now()
        let og = Date.now()
        let end
        const currentData = await prisma.agents.findMany({
            select: {
                name: true,
                act: true
            }
        })
        if (!matches) {
            matches = await this.mass_retrieve_comp()
            end = Date.now()
            console.log(indent + `Retrieved ${matches.length} matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        for (let a of agentList) {
            // console.log(indent + `Updating ${a}`)
            start = Date.now()
            for (let e of Eps) {
                if (e.name == "Closed Beta") {
                    let agentData = await get_agent_stats(a, matches, e.id)
                    if (agentData[0].picks > 0) {
                        agentData[0].img = agentData[2]
                        if (currentData.some(item => item.name === a && item.act === e.id)) {
                            await prisma.agents.update({
                                where: {
                                    name_act: {
                                        name: a,
                                        act: e.id
                                    }
                                },
                                data: {
                                    data: JSON.stringify(agentData[0])
                                }
                            })
                        } else {
                            await DatabaseFunctions.initAgentData(a, JSON.stringify(agentData[0]), e.id)
                            console.log(indent + `New row added! (${a})`)
                        }
                    }
                } else {
                    for (let act of e.acts) {
                        let agentData = await get_agent_stats(a, matches, act.id)
                        if (agentData[0].picks > 0) {
                            agentData[0].img = agentData[2]
                            if (currentData.some(item => item.name === a && item.act === act.id)) {
                                await prisma.agents.update({
                                    where: {
                                        name_act: {
                                            name: a,
                                            act: act.id
                                        }
                                    },
                                    data: {
                                        data: JSON.stringify(agentData[0])
                                    }
                                })
                            } else {
                                await DatabaseFunctions.initAgentData(a, JSON.stringify(agentData[0]), act.id)
                                console.log(indent + `New row added! (${a})`)
                            }
                        }
                    }
                }
            }
            end = Date.now()
            // console.log(indent + `Done (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        }
        end = Date.now()
        console.log(`AGENT DATA UPDATED (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
    },
    getMassAgentData: async function (act) {
        if (act) {
            const data = await prisma.mass_agents.findUnique({
                where: {
                    act
                }
            })
            return JSON.parse(data.data)
        } else {
            let act = 'all'
            const data = await prisma.mass_agents.findUnique({
                where: {
                    act
                }
            })
            return JSON.parse(data.data)
        }
    },
    updateMassAgentData: async function (matches, Eps, get_all_agent_stats) {
        console.log('UPDATING MASS AGENT DATA')
        let start = Date.now()
        let og = Date.now()
        let end
        const currentData = await prisma.mass_agents.findMany({
            select: {
                act: true
            }
        })
        end = Date.now()
        console.log(indent + `Retrieved old data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)


        start = Date.now()
        for (let e of Eps) {
            if (e.name == "Closed Beta") {
                let agentData = await get_all_agent_stats(matches, e.id)
                if (currentData.some(item => item.act === e.id)) {
                    await prisma.mass_agents.update({
                        where: {
                            act: e.id
                        },
                        data: {
                            data: JSON.stringify(agentData)
                        }
                    })
                } else {
                    await prisma.mass_agents.create({
                        data: {
                            data: JSON.stringify(agentData),
                            act: e.id
                        }
                    })
                    console.log(indent + 'New act added!')
                }

            } else {
                for (let act of e.acts) {
                    let agentData = await get_all_agent_stats(matches, act.id)
                    if (currentData.some(item => item.act === act.id)) {
                        await prisma.mass_agents.update({
                            where: {
                                act: act.id
                            },
                            data: {
                                data: JSON.stringify(agentData)
                            }
                        })
                    } else {
                        await prisma.mass_agents.create({
                            data: {
                                data: JSON.stringify(agentData),
                                act: act.id
                            }
                        })
                        console.log(indent + 'New act added!')
                    }

                }
            }
        }
        end = Date.now()
        console.log(indent + `Updated act-specific data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        let agentData = await get_all_agent_stats(matches)
        await prisma.mass_agents.update({
            where: {
                act: 'all'
            },
            data: {
                data: JSON.stringify(agentData)
            }
        })
        end = Date.now()
        console.log(indent + `Updated all act data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        console.log(indent + `MASS AGENT DATA UPDATED (${Math.round(((end - og) / 1000) * 10) / 10}s)`)

    },
    getMapPicks: async function (map) {
        if (map) {
            const data = await prisma.map_picks.findMany({
                where: {
                    map
                },
                select: {
                    map: true,
                    count: true,
                    act: true
                }
            })
            let final = {
                map,
                count: 0,
            }
            for (let act of data) {
                final.count += act.count
            }
            return final

        } else {
            let final = {}
            const data = await prisma.map_picks.findMany({
                select: {
                    map: true,
                    count: true,
                    act: true
                }
            })
            for (let d of data) {
                if (final[d.map]) {
                    final[d.map].count += d.count
                } else {
                    final[d.map] = {
                        count: d.count
                    }
                }
            }
            return final
        }
    },
    getMapPicksByAct: async function (act, map) {
        if (map) {
            const data = await prisma.map_picks.findMany({
                where: {
                    map,
                    act
                },
                select: {
                    map: true,
                    count: true,
                    act: true
                }
            })
            return data

        } else {
            const data = await prisma.map_picks.findMany({
                where: {
                    act
                },
                select: {
                    map: true,
                    count: true,
                    act: true
                }
            })
            return data
        }
    },
    initMapPicks: async function (matches, data) {
        if (matches) {
            let final = []
            for (let match of matches) {
                const foundEntry = final.find(item => item.map === match.data.metadata.map && item.act === match.data.metadata.season_id)
                if (foundEntry) {
                    foundEntry.count++
                } else {
                    final.push({
                        map: match.data.metadata.map,
                        count: 1,
                        act: match.data.metadata.season_id
                    })
                }
            }
            for (let data of final) {
                await prisma.map_picks.create({
                    data
                })
            }
        } else if (data) {
            await prisma.map_picks.create({
                data
            })
        } else {
            console.log('Map Pick Error - No data to init')
        }
    },
    updateMapPicks: async function (matches) {
        console.log('UPDATING MAP PICK DATA')
        let start = Date.now()
        let og = Date.now()
        let end
        const currentData = await prisma.map_picks.findMany({
            select: {
                map: true,
                count: true,
                act: true
            }
        })
        for (let data of currentData) {
            data.count = 0
        }
        end = Date.now()
        console.log(indent + `Retrieved old data, and reset count values (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        for (let match of matches) {
            const foundEntry = currentData.find(item => item.map === match.data.metadata.map && item.act === match.data.metadata.season_id)
            if (foundEntry) {
                foundEntry.count++
            } else {
                currentData.push({
                    map: match.data.metadata.map,
                    count: 1,
                    act: match.data.metadata.season_id,
                    new: true
                })
            }
        }
        end = Date.now()
        console.log(indent + `Updated new count values (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        for (let data of currentData) {
            if (data.new) {
                delete data.new
                await prisma.map_picks.create({
                    data
                })
            } else {
                await prisma.map_picks.update({
                    where: {
                        map_act: {
                            map: data.map,
                            act: data.act
                        }
                    },
                    data
                })
            }
        }
        end = Date.now()
        console.log(indent + `Database updated (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        console.log(`MAP PICK DATA UPDATED (${Math.round(((end - og) / 1000) * 10) / 10}s)`)

    },
    getMapStats: async function (act, map) {
        if (map) {
            if (act) {
                let final = []
                const data = await prisma.map_stats.findMany({
                    where: {
                        act,
                        map
                    },
                    select: {
                        act: true,
                        data: true
                    }
                })
                for (let m of data) {
                    m.data.act = m.act
                    final.push(JSON.parse(m.data))
                }
                return final
            } else {
                let act = 'all'
                let final = []
                const data = await prisma.map_stats.findMany({
                    where: {
                        act,
                        map
                    },
                    select: {
                        act: true,
                        data: true
                    }
                })
                for (let m of data) {
                    m.data.act = m.act
                    final.push(JSON.parse(m.data))
                }
                return final
            }
        } else {
            if (act) {
                let final = []
                const data = await prisma.map_stats.findMany({
                    where: {
                        act
                    },
                    select: {
                        act: true,
                        data: true
                    }
                })
                for (let m of data) {
                    m.data.act = m.act
                    final.push(JSON.parse(m.data))
                }
                return final
            } else {
                let act = 'all'
                let final = []
                const data = await prisma.map_stats.findMany({
                    where: {
                        act
                    },
                    select: {
                        act: true,
                        data: true
                    }
                })
                for (let m of data) {
                    m.data.act = m.act
                    final.push(JSON.parse(m.data))
                }
                return final
            }
        }
    },
    getCompActTotals: async function () {
        const data = await prisma.compActTotal.findMany()
        // console.log(data)
        return data
    },
    updateMapStats: async function (matches, Eps, get_map_stats) {
        console.log('UPDATING MAP STATS DATA')
        let start = Date.now()
        let og = Date.now()
        let end
        const currentData = await prisma.map_stats.findMany({
            select: {
                map: true,
                act: true
            }
        })
        end = Date.now()
        console.log(indent + `Retrieved old data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        for (let e of Eps) {
            if (e.name == "Closed Beta") {
                let mapData = await get_map_stats(matches, e.id)
                if (mapData.length > 0) {
                    for (let map of mapData) {
                        if (currentData.some(item => item.map === map.name && item.act === e.id)) {
                            await prisma.map_stats.update({
                                where: {
                                    map_act: {
                                        map: map.name,
                                        act: e.id
                                    }
                                },
                                data: {
                                    data: JSON.stringify(map)
                                }
                            })
                        } else {
                            await prisma.map_stats.create({
                                data: {
                                    map: map.name,
                                    data: JSON.stringify(map),
                                    act: e.id
                                }
                            })
                            console.log(indent + 'New row added!')
                        }
                    }
                }
            } else {
                for (let act of e.acts) {
                    let mapData = await get_map_stats(matches, act.id)
                    if (mapData.length > 0) {
                        for (let map of mapData) {
                            if (currentData.some(item => item.map === map.name && item.act === act.id)) {
                                await prisma.map_stats.update({
                                    where: {
                                        map_act: {
                                            map: map.name,
                                            act: act.id
                                        }
                                    },
                                    data: {
                                        data: JSON.stringify(map)
                                    }
                                })
                            } else {
                                await prisma.map_stats.create({
                                    data: {
                                        map: map.name,
                                        data: JSON.stringify(map),
                                        act: act.id
                                    }
                                })
                                console.log(indent + 'New row added!')
                            }
                        }
                    }
                }
            }
        }
        end = Date.now()
        console.log(indent + `Updated act-specific data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        start = Date.now()
        let mapData = await get_map_stats(matches)
        for (let map of mapData) {
            if (currentData.some(item => item.map === map.name && item.act === 'all')) {
                await prisma.map_stats.update({
                    where: {
                        map_act: {
                            map: map.name,
                            act: 'all'
                        }
                    },
                    data: {
                        data: JSON.stringify(map)
                    }
                })
            } else {
                await prisma.map_stats.create({
                    data: {
                        map: map.name,
                        data: JSON.stringify(map),
                        act: 'all'
                    }
                })
                console.log(indent + 'New row added!')
            }
        }
        end = Date.now()
        console.log(indent + `Updated all act data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        console.log(indent + `MAP STATS DATA UPDATED (${Math.round(((end - og) / 1000) * 10) / 10}s)`)

    },
    updateEpiData: async function (d) {
        console.log(`UPDATING EPISODE DATA`)
        let start = Date.now()
        let data = JSON.stringify(d)
        const update = await prisma.compact_epi_data.update({
            where: {
                compact_epi_data_id: 1
            },
            data: {
                data
            }
        })
        let end = Date.now()
        console.log(`Done (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    },
    getEpiData: async function () {
        const actCount = await this.getCompActTotals()
        const data = await prisma.compact_epi_data.findUnique({
            where: {
                compact_epi_data_id: 1
            },
            select: {
                data: true
            }
        })
        let newdata = JSON.parse(data.data)
        for (let ep of newdata) {
            if (ep.name == "Closed Beta") {
                for (let a of actCount) {
                    if (a.act_id == ep.id) {
                        ep.count = a.act_count
                    }
                }
                if (!ep.count) {
                    ep.count = 0
                }
            }
            else {
                for (let act of ep.acts) {
                    for (let a of actCount) {
                        if (a.act_id == act.id) {
                            act.count = a.act_count
                        }
                    }
                    if (!act.count) {
                        act.count = 0
                    }
                }
            }
        }
        return newdata
    },
};

module.exports = DatabaseFunctions;