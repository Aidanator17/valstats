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
const zlib = require('zlib');

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
};

// Helper function for JSON compression
async function compressJSON(jsonData) {
    return new Promise((resolve, reject) => {
        zlib.gzip(jsonData, (err, compressedBuffer) => {
            if (err) return reject(err);
            resolve(compressedBuffer);
        });
    });
}


const DatabaseFunctions = {
    check_player: async function (puuid) {
        const player = await prisma.players.findUnique({
            where: { puuid: puuid }
        });

        if (player) {
            return [true, player.id];
        }
        return [false, null];
    }
    ,
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
        const update = await prisma.blob_matches.update({
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
            const matches = await prisma.blob_matches.findMany({
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
            const matches = await prisma.blob_matches.findMany({
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
        const match = await prisma.blob_matches.findUnique({
            where: {
                match_id: mid
            }
        })
        return match
    },
    mass_add: async function (matches, unfiltered_matches, pid) {
        try {
            // Compress and prepare match data
            const matchinput = await Promise.all(
                matches.map(async (match) => {
                    const compressedBuffer = await compressJSON(JSON.stringify(match));
                    return {
                        match_id: match.data.metadata.matchid,
                        match_info: compressedBuffer,
                        match_type: match.data.metadata.mode_id,
                        match_map: match.data.metadata.map,
                        match_starttime: match.data.metadata.game_start,
                        act_id: match.data.metadata.season_id,
                    };
                })
            );

            // Insert matches into the database
            if (matchinput.length > 0) {
                await prisma.blob_matches.createMany({
                    data: matchinput,
                    skipDuplicates: true,
                });
                console.log(`${indent + matchinput.length} matches added successfully.`);
            }

            // Process unfiltered_matches and player IDs
            if (pid) {
                const userinput = unfiltered_matches.map((matchId) => ({
                    player_id: pid,
                    matchid: matchId,
                }));

                if (userinput.length > 0) {
                    await prisma.players_matches.createMany({
                        data: userinput,
                        skipDuplicates: true,
                    });
                    // console.log(`${userinput.length} player-match records added successfully.`);
                }
            }
        } catch (error) {
            console.error('Error in mass_add:', error);
        }
    },
    mass_retrieve: async function (skip) {
        let adj = 0
        if (skip) {
            adj = 1
        }
        const totalMatches = await prisma.blob_matches.count({
            where: {
                adjusted: adj
            }
        });
        let iter = Math.ceil(totalMatches / 300)
        let s = 0
        let all_matches = []
        for (let step = 0; step < iter; step++) {
            const iter_matches = await prisma.blob_matches.findMany({
                skip: s,
                take: 300,
                where: {
                    adjusted: adj
                }
            })
            all_matches = all_matches.concat(iter_matches)
            console.log(`retrieved ${iter_matches.length} matches, total: ${all_matches.length}/${totalMatches}`)
            s += 300
        }



        // await createJSON('mass_retrieve.json',all_matches)
        return all_matches
    },
    mass_retrieve_old: async function (skip) {

    },
    mass_retrieve_comp: async function (id) {
        if (id) {
            let start = Date.now()
            const totalMatches = await prisma.blob_matches.count({
                where: {
                    match_type: 'competitive',
                    act_id: id
                }
            })
            let iter = Math.ceil(totalMatches / 300)
            let s = 0
            let raw_matches = []
            for (let step = 0; step < iter; step++) {
                const iter_matches = await prisma.blob_matches.findMany({
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
            let matches = []
            try {
                start = Date.now()
                for (m in raw_matches) {


                    // Decompress the data
                    zlib.gunzip(raw_matches[m]['match_info'], (err, decompressedBuffer) => {
                        if (err) {
                            console.error('Error decompressing data:', err);
                            return;
                        }

                        const jsonData = JSON.parse(decompressedBuffer.toString());
                        matches.push(jsonData)
                    });
                }
                end = Date.now()
                console.log(`Decompressed comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            } catch (error) {
                console.error('Error retrieving data:', error);
            }





            // console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            return matches
        } else {
            let start = Date.now()
            let og = Date.now()
            const totalMatches = await prisma.blob_matches.count({
                where: {
                    match_type: 'competitive'
                }
            })
            let end = Date.now()
            console.log(`Retrieved comp match count (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            iterTake = 500
            let iter = Math.ceil(totalMatches / iterTake)
            let s = 0
            let raw_matches = []
            for (let step = 0; step < iter; step++) {
                start = Date.now()
                const iter_matches = await prisma.blob_matches.findMany({
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
                console.log(indent + `retrieved ${Math.round((raw_matches.length / totalMatches) * 1000) / 10}% matches, total: ${raw_matches.length}/${totalMatches} (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            }

            // createJSON('compressTest.json',raw_matches[0]['match_info'].slice(0, 2)); // Should log <Buffer 1f 8b>


            end = Date.now()
            console.log(`Retrieved comp matches (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
            start = Date.now()
            let matches = []
            try {
                start = Date.now()

                for (const match of raw_matches) {
                    try {
                        const decompressedBuffer = await new Promise((resolve, reject) => {
                            zlib.gunzip(match.match_info, (err, buffer) => {
                                if (err) return reject(err);
                                resolve(buffer);
                            });
                        });

                        const jsonData = JSON.parse(decompressedBuffer.toString());
                        matches.push(jsonData);
                    } catch (error) {
                        console.error('Error decompressing match:', error, 'Match ID:', match.match_id);
                    }
                }

                end = Date.now()
                console.log(`Decompressed comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
                return matches;
            } catch (error) {
                console.error('Error retrieving data:', error);
            }
            end = Date.now()
            // console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            return matches
        }
    },
    small_retrieve_comp: async function (id) {
        if (id) {
            let start = Date.now()
            const raw_matches = await prisma.matches.findMany({
                take: 300,
                where: {
                    match_type: 'competitive',
                    act_id: id
                },
                select: {
                    match_info: true
                }
            })
            let end = Date.now()
            console.log(`Retrieved 300 comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            start = Date.now()
            let matches = []
            for (m in raw_matches) {
                matches.push(JSON.parse(raw_matches[m]['match_info']))
            }
            end = Date.now()
            console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            return matches
        } else {
            let start = Date.now()
            const raw_matches = await prisma.matches.findMany({
                take: 300,
                where: {
                    match_type: 'competitive'
                },
                select: {
                    match_info: true
                }
            })
            let end = Date.now()
            console.log(`Retrieved 300 comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            start = Date.now()
            let matches = []
            for (m in raw_matches) {
                matches.push(JSON.parse(raw_matches[m]['match_info']))
            }
            end = Date.now()
            console.log(`Formatted comp matches (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
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
            "Vyse",
            "Tejo"
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
        console.log(act)
        if (act) {
            const data = await prisma.mass_agents.findUnique({
                where: {
                    act
                }
            })
            console.log(data)
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
    getMapPicks: async function (map, act) {
        if (act) {
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
                    where: {
                        act
                    },
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
        }
        else {
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
        const data = await prisma.act_comp_totals.findMany()
        // console.log(data)
        return data
    },
    updateCompActTotals: async function (matches) {
        let totals = [];

        for (let match of matches) {
            let actId = match.data.metadata.season_id;
            let existing = totals.find(item => item.act_id === actId);

            if (existing) {
                // If act_id exists, increment act_count
                existing.act_count += 1;
            } else {
                // If act_id doesn't exist, add a new object with count 1
                totals.push({ act_id: actId, act_count: 1 });
            }
        }

        for (let total of totals) {
            const { act_id, act_count } = total;

            // Check if the act_id already exists in the table
            const existing = await prisma.act_comp_totals.findUnique({
                where: { act_id: act_id },
            });

            if (existing) {
                // If it exists, update the act_count
                await prisma.act_comp_totals.update({
                    where: { act_id: act_id },
                    data: { act_count: act_count },
                });
            } else {
                // If it doesn't exist, create a new entry
                await prisma.act_comp_totals.create({
                    data: { act_id: act_id, act_count: act_count },
                });
            }
        }
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
        createJSON('actData.json', newdata)
        return newdata
    },
    getActiveAct: async function (){
        let data = await this.getEpiData()
        for (const episode of data) {
            const activeAct = episode.acts.find(act => act.isActive === true);
            if (activeAct) {
                return activeAct;
            }
        }
        return null; // Return null if no active act is found
    },
    updateLeaderboard: async function (matches, eps) {
        let start = Date.now()
        for (let e of eps) {
            if (e.name != 'Closed Beta') {
                for (let a of e.acts) {
                    const leaderboard = {};

                    matches.forEach(match => {
                        if (match.data.metadata.season_id == a.id) {
                            const players = match.data.players.all_players; // Access players array
                            const totalRounds = match.data.metadata.rounds_played; // Total rounds played in the match
                            const redTeamWon = match.data.teams.red.has_won; // Check if Red team won
                            const blueTeamWon = match.data.teams.blue.has_won; // Check if Blue team won
                            const matchDate = match.data.metadata.game_start; // Game start timestamp (Unix)

                            // Loop through each player in the match
                            players.forEach(player => {
                                const playerId = player.puuid; // Unique player identifier
                                const playerName = player.name; // Player name
                                const playerTag = player.tag; // Player tag
                                const stats = player.stats; // Player stats for the match
                                const currentTier = player.currenttier_patched; // Player's rank (string)

                                if (!leaderboard[playerId]) {
                                    // If player does not exist in the leaderboard, add them
                                    leaderboard[playerId] = {
                                        id: playerId,
                                        name: playerName,
                                        tag: playerTag,
                                        matchesPlayed: 0,
                                        kills: 0,
                                        deaths: 0,
                                        assists: 0,
                                        score: 0,
                                        bodyshots: 0,
                                        headshots: 0,
                                        legshots: 0,
                                        totalRounds: 0,
                                        wins: 0, // Initialize wins to 0
                                        last_known_rank: currentTier, // Initialize rank with current match's rank
                                        last_known_rank_date: matchDate, // Initialize rank date with current match's timestamp
                                    };
                                }

                                // Update player's stats in the leaderboard
                                leaderboard[playerId].matchesPlayed += 1;
                                leaderboard[playerId].kills += stats.kills;
                                leaderboard[playerId].deaths += stats.deaths;
                                leaderboard[playerId].assists += stats.assists;
                                leaderboard[playerId].score += stats.score;
                                leaderboard[playerId].bodyshots += stats.bodyshots;
                                leaderboard[playerId].headshots += stats.headshots;
                                leaderboard[playerId].legshots += stats.legshots;
                                leaderboard[playerId].totalRounds += totalRounds;

                                // Update wins if the player's team won
                                if ((player.team === 'Red' && redTeamWon) || (player.team === 'Blue' && blueTeamWon)) {
                                    leaderboard[playerId].wins += 1;
                                }

                                // Update last_known_rank and last_known_rank_date if this match is more recent
                                if (matchDate > leaderboard[playerId].last_known_rank_date) {
                                    leaderboard[playerId].last_known_rank = currentTier;
                                    leaderboard[playerId].last_known_rank_date = matchDate;
                                    leaderboard[playerId].name = playerName;
                                    leaderboard[playerId].tag = playerTag;
                                }
                            });
                        }
                    });

                    start = Date.now()
                    // Step 1: Filter out players with less than 20 matches played
                    const filteredLeaderboard = Object.values(leaderboard).filter(player => player.matchesPlayed >= 10);

                    // Step 2: Loop through each player and calculate new stats
                    filteredLeaderboard.forEach(player => {
                        const totalShots = player.headshots + player.bodyshots + player.legshots;
                        player.headshot_percentage = totalShots > 0 ? (player.headshots / totalShots) * 100 : 0;
                        player.KD = player.deaths > 0 ? player.kills / player.deaths : player.kills;
                        player.KDA = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
                        player.win_percentage = (player.wins / player.matchesPlayed) * 100;
                        player.ACS = player.totalRounds > 0 ? player.score / player.totalRounds : 0;
                    });
                    const sortedByHeadshotPercentage = [...filteredLeaderboard].sort((a, b) => b.headshot_percentage - a.headshot_percentage);
                    const sortedByKD = [...filteredLeaderboard].sort((a, b) => b.KD - a.KD);
                    const sortedByKDA = [...filteredLeaderboard].sort((a, b) => b.KDA - a.KDA);
                    const sortedByWinPercentage = [...filteredLeaderboard].sort((a, b) => b.win_percentage - a.win_percentage);
                    const sortedByACS = [...filteredLeaderboard].sort((a, b) => b.ACS - a.ACS);
                    const all_data = {
                        headshot: sortedByHeadshotPercentage,
                        kd: sortedByKD,
                        kda: sortedByKDA,
                        wins: sortedByWinPercentage,
                        acs: sortedByACS
                    }
                    // createJSON(`/leaderboard/test/${a.id}.json`,all_data)
                    const update = await prisma.leaderboards.upsert({
                        where: {
                            act: a.id,
                        },
                        update: {
                            data: JSON.stringify(all_data)
                        },
                        create: {
                            act: a.id,
                            data: JSON.stringify(all_data)
                        }
                    })
                }
            }
        }

        const leaderboard = {};

        matches.forEach(match => {
            const players = match.data.players.all_players; // Access players array
            const totalRounds = match.data.metadata.rounds_played; // Total rounds played in the match
            const redTeamWon = match.data.teams.red.has_won; // Check if Red team won
            const blueTeamWon = match.data.teams.blue.has_won; // Check if Blue team won
            const matchDate = match.data.metadata.game_start; // Game start timestamp (Unix)

            // Loop through each player in the match
            players.forEach(player => {
                const playerId = player.puuid; // Unique player identifier
                const playerName = player.name; // Player name
                const playerTag = player.tag; // Player tag
                const stats = player.stats; // Player stats for the match
                const currentTier = player.currenttier_patched; // Player's rank (string)

                if (!leaderboard[playerId]) {
                    // If player does not exist in the leaderboard, add them
                    leaderboard[playerId] = {
                        id: playerId,
                        name: playerName,
                        tag: playerTag,
                        matchesPlayed: 0,
                        kills: 0,
                        deaths: 0,
                        assists: 0,
                        score: 0,
                        bodyshots: 0,
                        headshots: 0,
                        legshots: 0,
                        totalRounds: 0,
                        wins: 0, // Initialize wins to 0
                        last_known_rank: currentTier, // Initialize rank with current match's rank
                        last_known_rank_date: matchDate, // Initialize rank date with current match's timestamp
                    };
                }

                // Update player's stats in the leaderboard
                leaderboard[playerId].matchesPlayed += 1;
                leaderboard[playerId].kills += stats.kills;
                leaderboard[playerId].deaths += stats.deaths;
                leaderboard[playerId].assists += stats.assists;
                leaderboard[playerId].score += stats.score;
                leaderboard[playerId].bodyshots += stats.bodyshots;
                leaderboard[playerId].headshots += stats.headshots;
                leaderboard[playerId].legshots += stats.legshots;
                leaderboard[playerId].totalRounds += totalRounds;

                // Update wins if the player's team won
                if ((player.team === 'Red' && redTeamWon) || (player.team === 'Blue' && blueTeamWon)) {
                    leaderboard[playerId].wins += 1;
                }

                // Update last_known_rank and last_known_rank_date if this match is more recent
                if (matchDate > leaderboard[playerId].last_known_rank_date) {
                    leaderboard[playerId].last_known_rank = currentTier;
                    leaderboard[playerId].last_known_rank_date = matchDate;
                    leaderboard[playerId].name = playerName;
                    leaderboard[playerId].tag = playerTag;
                }
            });

        });

        start = Date.now()
        // Step 1: Filter out players with less than 20 matches played
        const filteredLeaderboard = Object.values(leaderboard).filter(player => player.matchesPlayed >= 20);

        // Step 2: Loop through each player and calculate new stats
        filteredLeaderboard.forEach(player => {
            const totalShots = player.headshots + player.bodyshots + player.legshots;
            player.headshot_percentage = totalShots > 0 ? (player.headshots / totalShots) * 100 : 0;
            player.KD = player.deaths > 0 ? player.kills / player.deaths : player.kills;
            player.KDA = player.deaths > 0 ? (player.kills + player.assists) / player.deaths : player.kills + player.assists;
            player.win_percentage = (player.wins / player.matchesPlayed) * 100;
            player.ACS = player.totalRounds > 0 ? player.score / player.totalRounds : 0;
        });
        const sortedByHeadshotPercentage = [...filteredLeaderboard].sort((a, b) => b.headshot_percentage - a.headshot_percentage);
        const sortedByKD = [...filteredLeaderboard].sort((a, b) => b.KD - a.KD);
        const sortedByKDA = [...filteredLeaderboard].sort((a, b) => b.KDA - a.KDA);
        const sortedByWinPercentage = [...filteredLeaderboard].sort((a, b) => b.win_percentage - a.win_percentage);
        const sortedByACS = [...filteredLeaderboard].sort((a, b) => b.ACS - a.ACS);
        const all_data = {
            headshot: sortedByHeadshotPercentage,
            kd: sortedByKD,
            kda: sortedByKDA,
            wins: sortedByWinPercentage,
            acs: sortedByACS
        }
        const update = await prisma.leaderboards.upsert({
            where: {
                act: 'all',
            },
            update: {
                data: JSON.stringify(all_data)
            },
            create: {
                act: 'all',
                data: JSON.stringify(all_data)
            }
        })
        let end = Date.now()
        console.log(`Recorded leaderboard stats (${Math.round(((end - start) / 1000) * 100) / 100}s)`)
    },
    getLeaderboard: async function () {
        const data = await prisma.leaderboards.findMany()
        for (let i = data.length - 1; i >= 0; i--) {
            let act = data[i];
            let parsedData = JSON.parse(act.data);
            if (parsedData.headshot.length > 0) {
                act.data = parsedData;
            } else {
                data.splice(i, 1); // Remove the element at index i
            }
        }
        createJSON('massLeaderboard.json', data)
        return data
    },
    blobSwitch: async function () {
        const BATCH_SIZE = 100; // Number of matches to insert per batch

        const old_matches = await this.mass_retrieve(true);

        async function batchInsertMatches(matches) {
            for (let i = 0; i < matches.length; i += BATCH_SIZE) {
                const batch = matches.slice(i, i + BATCH_SIZE);

                // Compress and insert each batch
                try {
                    const batchData = await Promise.all(
                        batch.map(async (match) => {
                            const compressedBuffer = await new Promise((resolve, reject) => {
                                zlib.gzip(match.match_info, (err, compressed) => {
                                    if (err) return reject(err);
                                    resolve(compressed);
                                });
                            });

                            return {
                                match_id: match.match_id,
                                match_info: compressedBuffer,
                                match_type: match.match_type,
                                match_map: match.match_map,
                                match_starttime: match.match_starttime,
                                act_id: match.act_id,
                                adjusted: match.adjusted,
                            };
                        })
                    );

                    // Batch insert the prepared data
                    await prisma.blob_matches.createMany({
                        data: batchData,
                        skipDuplicates: true, // Prevents errors on duplicate rows
                    });

                    console.log(`Batch ${i / BATCH_SIZE + 1} inserted successfully.`);
                } catch (error) {
                    console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
                }
            }
        }

        // Call the batch insertion function
        await batchInsertMatches(old_matches);

        console.log('All matches inserted.');

    },
    getRandomPlayers: async function (iter) {
        // Use a raw query to get random rows from the players table
        const rows = await prisma.$queryRaw`
          SELECT puuid 
          FROM players 
          ORDER BY RAND() 
          LIMIT ${iter}
        `;
        // Map the resulting rows to extract only the 'puuid' strings.
        return rows.map(row => row.puuid);
      }
};

module.exports = DatabaseFunctions;