const {
    PrismaClient
} = require('@prisma/client');
const {
    tr
} = require('date-fns/locale');
const {
    json
} = require('express');
const prisma = new PrismaClient();
const fs = require('fs');
const apiFunctions = require('./valAPI.js');
const processFunctions = require("./processModel")
const DatabaseFunctions = require("./databaseModel");
const {
    name
} = require('ejs');
const {
    kill
} = require('process');


async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

function getUserTeam(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                return 'red'
            } else {
                return 'blue'
            }
        }
    }
}

function winCheckNum(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                if (match['data']['teams']['red']['has_won']) {
                    return 1
                } else {
                    return 0
                }
            } else {
                if (match['data']['teams']['blue']['has_won']) {
                    return 1
                } else {
                    return 0
                }
            }
        }
    }
}

function lossCheckNum(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                if (match['data']['teams']['red']['has_won']) {
                    return 0
                } else {
                    return 1
                }
            } else {
                if (match['data']['teams']['blue']['has_won']) {
                    return 0
                } else {
                    return 1
                }
            }
        }
    }
}

function matchPlants(match, puuid) {
    let plants = 0
    for (let r of match.data.rounds) {
        if (r.bomb_planted) {
            if (r.plant_events.planted_by.puuid == puuid) {
                plants++
            }
        }
    }
    return plants
}
function matchAgentPlants(match, puuid, agent) {
    let plants = 0
    if (match.data.metadata.agent == agent) {
        for (let r of match.data.rounds) {
            if (r.bomb_planted) {
                if (r.plant_events.planted_by.puuid == puuid) {
                    plants++
                }
            }
        }
    }
    return plants
}
function createKillEvents(rounds) {
    rounds.forEach(round => {
        if (!round.kill_events) {
            round.kill_events = [];

            // Populate kill_events from player_stats
            round.player_stats.forEach(player => {
                player.kill_events.forEach(event => {
                    round.kill_events.push({
                        killer_puuid: player.player_puuid,
                        killer_team: player.player_team,
                        victim_puuid: event.victim_puuid,
                        victim_team: round.player_stats.find(p => p.player_puuid === event.victim_puuid)?.player_team || null,
                        time: event.kill_time_in_round,
                    });
                });
            });

            // Sort by time for proper event chronology
            round.kill_events.sort((a, b) => a.time - b.time);
        }
    });
}


const UserFunctions = {
    getTotalStats: async function (matches, puuid) {
        let overall = {
            hs: 0,
            bs: 0,
            ls: 0,
            HSP: 0,
            kills: 0,
            deaths: 0,
            KD: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            wp: 0
        }
        for (m in matches) {
            for (p in matches[m]['data']['players']['all_players']) {
                if (matches[m]['data']['players']['all_players'][p]['puuid'] == puuid) {
                    overall.kills = overall.kills + matches[m]['data']['players']['all_players'][p]['stats']['kills']
                    overall.deaths = overall.deaths + matches[m]['data']['players']['all_players'][p]['stats']['deaths']
                    overall.hs = overall.hs + matches[m]['data']['players']['all_players'][p]['stats']['headshots']
                    overall.bs = overall.bs
                } + matches[m]['data']['players']['all_players'][p]['stats']['bodyshots']
                overall.ls = overall.ls + matches[m]['data']['players']['all_players'][p]['stats']['legshots']

                if (matches[m]['data']['metadata']['result'] == 'Win') {
                    overall.wins++
                } else if (matches[m]['data']['metadata']['result'] == 'Loss') {
                    overall.losses++
                } else {
                    overall.draws++
                }
            }
        }
        overall.HSP = Math.round((overall.hs / (overall.bs + overall.hs + overall.ls)) * 1000) / 10
        overall.KD = Math.round((overall.kills / overall.deaths) * 100) / 100
        overall.wp = Math.round((overall.wins / (overall.wins + overall.losses)) * 1000) / 10
        return overall
    },
    getHalfStats: async function (matches, puuid) {
        let overall = {
            hs: 0,
            bs: 0,
            ls: 0,
            HSP: 0,
            kills: 0,
            deaths: 0,
            KD: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            wp: 0
        }
        for (m in matches) {
            for (p in matches[m]['data']['players']['all_players']) {
                if (matches[m]['data']['players']['all_players'][p]['puuid'] == puuid) {
                    overall.kills = overall.kills + matches[m]['data']['players']['all_players'][p]['stats']['kills']
                    overall.deaths = overall.deaths + matches[m]['data']['players']['all_players'][p]['stats']['deaths']
                    overall.hs = overall.hs + matches[m]['data']['players']['all_players'][p]['stats']['headshots']
                    overall.bs = overall.bs
                } + matches[m]['data']['players']['all_players'][p]['stats']['bodyshots']
                overall.ls = overall.ls + matches[m]['data']['players']['all_players'][p]['stats']['legshots']

                if (matches[m]['data']['metadata']['result'] == 'Win') {
                    overall.wins++
                } else if (matches[m]['data']['metadata']['result'] == 'Loss') {
                    overall.losses++
                } else {
                    overall.draws++
                }
            }
        }
        overall.HSP = Math.round((overall.hs / (overall.bs + overall.hs + overall.ls)) * 1000) / 10
        overall.KD = Math.round((overall.kills / overall.deaths) * 100) / 100
        overall.wp = Math.round((overall.wins / (overall.wins + overall.losses)) * 1000) / 10
        return overall
    },
    getAgentStats: async function (matches, puuid) {
        let agents = []
        for (m in matches) {
            if (agents.length == 0) {
                if (matches[m]['data']['metadata']['result'] == "Win") {
                    let input = {
                        agent: matches[m]['data']['metadata']['agent'],
                        img: matches[m]['data']['metadata'].agent_img.small,
                        count: 1,
                        rounds: matches[m]['data']['metadata'].rounds_played,
                        wins: 1,
                        losses: 0,
                        draws: 0,
                        plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                        headshots: matches[m]['data']['metadata'].stats.headshots,
                        bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                        legshots: matches[m]['data']['metadata'].stats.legshots,
                        kills: matches[m]['data']['metadata']['kills'],
                        deaths: matches[m]['data']['metadata']['deaths'],
                        assists: matches[m]['data']['metadata']['assists'],
                        maps: {
                            "Abyss": 0,
                            "Ascent": 0,
                            "Bind": 0,
                            "Breeze": 0,
                            "Fracture": 0,
                            "Haven": 0,
                            "Icebox": 0,
                            "Lotus": 0,
                            "Pearl": 0,
                            "Split": 0,
                            "Sunset": 0,
                        },
                        ability_casts: {
                            "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                            "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                            "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                            "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                } else if (matches[m]['data']['metadata']['result'] == "Loss") {
                    let input = {
                        agent: matches[m]['data']['metadata']['agent'],
                        img: matches[m]['data']['metadata'].agent_img.small,
                        count: 1,
                        rounds: matches[m]['data']['metadata'].rounds_played,
                        wins: 0,
                        losses: 1,
                        draws: 0,
                        plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                        headshots: matches[m]['data']['metadata'].stats.headshots,
                        bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                        legshots: matches[m]['data']['metadata'].stats.legshots,
                        kills: matches[m]['data']['metadata']['kills'],
                        deaths: matches[m]['data']['metadata']['deaths'],
                        assists: matches[m]['data']['metadata']['assists'],
                        maps: {
                            "Abyss": 0,
                            "Ascent": 0,
                            "Bind": 0,
                            "Breeze": 0,
                            "Fracture": 0,
                            "Haven": 0,
                            "Icebox": 0,
                            "Lotus": 0,
                            "Pearl": 0,
                            "Split": 0,
                            "Sunset": 0,
                        },
                        ability_casts: {
                            "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                            "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                            "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                            "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                } else {
                    let input = {
                        agent: matches[m]['data']['metadata']['agent'],
                        img: matches[m]['data']['metadata'].agent_img.small,
                        count: 1,
                        rounds: matches[m]['data']['metadata'].rounds_played,
                        wins: 0,
                        losses: 0,
                        draws: 1,
                        plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                        headshots: matches[m]['data']['metadata'].stats.headshots,
                        bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                        legshots: matches[m]['data']['metadata'].stats.legshots,
                        kills: matches[m]['data']['metadata']['kills'],
                        deaths: matches[m]['data']['metadata']['deaths'],
                        assists: matches[m]['data']['metadata']['assists'],
                        maps: {
                            "Abyss": 0,
                            "Ascent": 0,
                            "Bind": 0,
                            "Breeze": 0,
                            "Fracture": 0,
                            "Haven": 0,
                            "Icebox": 0,
                            "Lotus": 0,
                            "Pearl": 0,
                            "Split": 0,
                            "Sunset": 0,
                        },
                        ability_casts: {
                            "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                            "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                            "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                            "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                }
            } else {
                let found = false
                for (a in agents) {
                    if (agents[a].agent == matches[m]['data']['metadata']['agent']) {
                        agents[a].count++
                        agents[a].kills = agents[a].kills + matches[m]['data']['metadata']['kills']
                        agents[a].deaths = agents[a].deaths + matches[m]['data']['metadata']['deaths']
                        agents[a].assists = agents[a].assists + matches[m]['data']['metadata']['assists']
                        if (matches[m]['data']['metadata']['result'] == "Win") {
                            agents[a].wins++
                            agents[a].maps[matches[m]['data']['metadata']['map']]++
                        } else if (matches[m]['data']['metadata']['result'] == "Loss") {
                            agents[a].losses++
                            agents[a].maps[matches[m]['data']['metadata']['map']]++
                        } else {
                            agents[a].draws++
                            agents[a].maps[matches[m]['data']['metadata']['map']]++
                        }
                        agents[a].plants += matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent'])

                        agents[a].headshots += matches[m]['data']['metadata'].stats.headshots
                        agents[a].bodyshots += matches[m]['data']['metadata'].stats.bodyshots
                        agents[a].legshots += matches[m]['data']['metadata'].stats.legshots

                        agents[a].rounds += matches[m]['data']['metadata'].rounds_played
                        agents[a].ability_casts.c_cast += matches[m]['data']['metadata'].ability_casts.c_cast
                        agents[a].ability_casts.e_cast += matches[m]['data']['metadata'].ability_casts.e_cast
                        agents[a].ability_casts.q_cast += matches[m]['data']['metadata'].ability_casts.q_cast
                        agents[a].ability_casts.x_cast += matches[m]['data']['metadata'].ability_casts.x_cast
                        found = true
                    }
                }
                if (!found) {
                    if (matches[m]['data']['metadata']['result'] == "Win") {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            img: matches[m]['data']['metadata'].agent_img.small,
                            count: 1,
                            rounds: matches[m]['data']['metadata'].rounds_played,
                            wins: 1,
                            losses: 0,
                            draws: 0,
                            plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                            headshots: matches[m]['data']['metadata'].stats.headshots,
                            bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                            legshots: matches[m]['data']['metadata'].stats.legshots,
                            kills: matches[m]['data']['metadata']['kills'],
                            deaths: matches[m]['data']['metadata']['deaths'],
                            assists: matches[m]['data']['metadata']['assists'],
                            maps: {
                                "Abyss": 0,
                                "Ascent": 0,
                                "Bind": 0,
                                "Breeze": 0,
                                "Fracture": 0,
                                "Haven": 0,
                                "Icebox": 0,
                                "Lotus": 0,
                                "Pearl": 0,
                                "Split": 0,
                                "Sunset": 0,
                            },
                            ability_casts: {
                                "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                                "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                                "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                                "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                            }
                        }
                        input.maps[matches[m]['data']['metadata']['map']]++
                        agents.push(input)
                    } else if (matches[m]['data']['metadata']['result'] == "Loss") {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            img: matches[m]['data']['metadata'].agent_img.small,
                            count: 1,
                            rounds: matches[m]['data']['metadata'].rounds_played,
                            wins: 0,
                            losses: 1,
                            draws: 0,
                            plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                            headshots: matches[m]['data']['metadata'].stats.headshots,
                            bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                            legshots: matches[m]['data']['metadata'].stats.legshots,
                            kills: matches[m]['data']['metadata']['kills'],
                            deaths: matches[m]['data']['metadata']['deaths'],
                            assists: matches[m]['data']['metadata']['assists'],
                            maps: {
                                "Abyss": 0,
                                "Ascent": 0,
                                "Bind": 0,
                                "Breeze": 0,
                                "Fracture": 0,
                                "Haven": 0,
                                "Icebox": 0,
                                "Lotus": 0,
                                "Pearl": 0,
                                "Split": 0,
                                "Sunset": 0,
                            },
                            ability_casts: {
                                "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                                "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                                "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                                "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                            }
                        }
                        input.maps[matches[m]['data']['metadata']['map']]++
                        agents.push(input)
                    } else {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            img: matches[m]['data']['metadata'].agent_img.small,
                            count: 1,
                            rounds: matches[m]['data']['metadata'].rounds_played,
                            wins: 0,
                            losses: 0,
                            draws: 1,
                            plants: matchAgentPlants(matches[m], puuid, matches[m]['data']['metadata']['agent']),
                            headshots: matches[m]['data']['metadata'].stats.headshots,
                            bodyshots: matches[m]['data']['metadata'].stats.bodyshots,
                            legshots: matches[m]['data']['metadata'].stats.legshots,
                            kills: matches[m]['data']['metadata']['kills'],
                            deaths: matches[m]['data']['metadata']['deaths'],
                            assists: matches[m]['data']['metadata']['assists'],
                            maps: {
                                "Abyss": 0,
                                "Ascent": 0,
                                "Bind": 0,
                                "Breeze": 0,
                                "Fracture": 0,
                                "Haven": 0,
                                "Icebox": 0,
                                "Lotus": 0,
                                "Pearl": 0,
                                "Split": 0,
                                "Sunset": 0,
                            },
                            ability_casts: {
                                "x_cast": matches[m]['data']['metadata'].ability_casts.x_cast,
                                "e_cast": matches[m]['data']['metadata'].ability_casts.e_cast,
                                "q_cast": matches[m]['data']['metadata'].ability_casts.q_cast,
                                "c_cast": matches[m]['data']['metadata'].ability_casts.c_cast
                            }
                        }
                        input.maps[matches[m]['data']['metadata']['map']]++
                        agents.push(input)
                    }
                }
            }

        }
        return agents
    },
    getMapStats: async function (matches, puuid) {
        let maps_played = {
            "Abyss": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Ascent": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Bind": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Breeze": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Fracture": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Haven": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Icebox": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Lotus": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Pearl": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Split": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            "Sunset": {
                count: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
        }
        for (m in matches) {
            if (matches[m]['data']['metadata']['result'] == "Win") {
                maps_played[matches[m]['data']['metadata']['map']].count++
                maps_played[matches[m]['data']['metadata']['map']].kills += matches[m]['data']['metadata']['kills']
                maps_played[matches[m]['data']['metadata']['map']].deaths += matches[m]['data']['metadata']['deaths']
                maps_played[matches[m]['data']['metadata']['map']].assists += matches[m]['data']['metadata']['assists']
                maps_played[matches[m]['data']['metadata']['map']].wins++
            } else if (matches[m]['data']['metadata']['result'] == "Loss") {
                maps_played[matches[m]['data']['metadata']['map']].count++
                maps_played[matches[m]['data']['metadata']['map']].kills += matches[m]['data']['metadata']['kills']
                maps_played[matches[m]['data']['metadata']['map']].deaths += matches[m]['data']['metadata']['deaths']
                maps_played[matches[m]['data']['metadata']['map']].assists += matches[m]['data']['metadata']['assists']
                maps_played[matches[m]['data']['metadata']['map']].losses++

            } else {
                maps_played[matches[m]['data']['metadata']['map']].count++
                maps_played[matches[m]['data']['metadata']['map']].kills += matches[m]['data']['metadata']['kills']
                maps_played[matches[m]['data']['metadata']['map']].deaths += matches[m]['data']['metadata']['deaths']
                maps_played[matches[m]['data']['metadata']['map']].assists += matches[m]['data']['metadata']['assists']
                maps_played[matches[m]['data']['metadata']['map']].draws++
            }

        }
        return maps_played
    },
    getTeammates: async function (matches, puuid) {
        let userteam
        let teammates = []
        for (m in matches) {
            userteam = getUserTeam(matches[m], puuid)
            for (tm in matches[m]['data']['players'][userteam]) {
                if (matches[m]['data']['players'][userteam][tm]['puuid'] != puuid) {
                    if (teammates.length == 0) {
                        teammates.push({
                            puuid: matches[m]['data']['players'][userteam][tm]['puuid'],
                            count: 1,
                            wins: winCheckNum(matches[m], puuid),
                            username: matches[m]['data']['players'][userteam][tm]['name'],
                            tag: matches[m]['data']['players'][userteam][tm]['tag'],
                            pStats: {
                                kills: matches[m]['data'].metadata.kills,
                                deaths: matches[m]['data'].metadata.deaths
                            },
                            fStats: {
                                kills: matches[m]['data']['players'][userteam][tm].stats.kills,
                                deaths: matches[m]['data']['players'][userteam][tm].stats.deaths
                            }
                        })
                    } else {
                        let found = false
                        for (pl in teammates) {
                            if (teammates[pl].puuid == matches[m]['data']['players'][userteam][tm]['puuid']) {
                                teammates[pl].count++
                                teammates[pl].wins += winCheckNum(matches[m], puuid)
                                teammates[pl].pStats.kills += matches[m]['data'].metadata.kills
                                teammates[pl].pStats.deaths += matches[m]['data'].metadata.deaths
                                teammates[pl].fStats.kills += matches[m]['data']['players'][userteam][tm].stats.kills
                                teammates[pl].fStats.deaths += matches[m]['data']['players'][userteam][tm].stats.deaths
                                found = true
                                break
                            }
                        }
                        if (!found) {
                            teammates.push({
                                puuid: matches[m]['data']['players'][userteam][tm]['puuid'],
                                count: 1,
                                wins: winCheckNum(matches[m], puuid),
                                username: matches[m]['data']['players'][userteam][tm]['name'],
                                tag: matches[m]['data']['players'][userteam][tm]['tag'],
                                pStats: {
                                    kills: matches[m]['data'].metadata.kills,
                                    deaths: matches[m]['data'].metadata.deaths
                                },
                                fStats: {
                                    kills: matches[m]['data']['players'][userteam][tm].stats.kills,
                                    deaths: matches[m]['data']['players'][userteam][tm].stats.deaths
                                }
                            })
                        }
                    }
                }
            }

        }
        return teammates
    },
    getActStats: async function (matches, puuid, acts) {
        let actStats = []
        for (m in matches) {
            for (a in acts) {
                if (acts[a].name == "Closed Beta") {
                    if (matches[m]['data']['metadata']['season_id'] == acts[a]) {
                        if (actStats.length == 0) {
                            actStats.push({
                                act: acts[a].id,
                                name: acts[a].name,
                                count: 1,
                                wins: winCheckNum(matches[m], puuid),
                                losses: lossCheckNum(matches[m], puuid),
                                kills: matches[m]['data']['metadata']['kills'],
                                deaths: matches[m]['data']['metadata']['deaths'],
                                assists: matches[m]['data']['metadata']['assists'],
                            })
                        } else {
                            let found = false
                            for (act in actStats) {
                                if (actStats[act].act == acts[a].id) {
                                    actStats[act].count++
                                    actStats[act].wins += winCheckNum(matches[m], puuid)
                                    actStats[act].losses += lossCheckNum(matches[m], puuid)
                                    actStats[act].kills += matches[m]['data']['metadata']['kills']
                                    actStats[act].deaths += matches[m]['data']['metadata']['deaths']
                                    actStats[act].assists += matches[m]['data']['metadata']['assists']
                                    found = true
                                    break
                                }
                            }
                            if (!found) {
                                actStats.push({
                                    act: acts[a].id,
                                    count: 1,
                                    wins: winCheckNum(matches[m], puuid),
                                    losses: lossCheckNum(matches[m], puuid),
                                    kills: matches[m]['data']['metadata']['kills'],
                                    deaths: matches[m]['data']['metadata']['deaths'],
                                    assists: matches[m]['data']['metadata']['assists'],
                                })
                            }
                        }
                    }
                } else {
                    for (act in acts[a].acts) {
                        if (matches[m]['data']['metadata']['season_id'] == acts[a].acts[act].id) {
                            if (actStats.length == 0) {
                                actStats.push({
                                    act: acts[a].acts[act].id,
                                    name: acts[a].name + " - " + acts[a].acts[act].name,
                                    count: 1,
                                    wins: winCheckNum(matches[m], puuid),
                                    losses: lossCheckNum(matches[m], puuid),
                                    kills: matches[m]['data']['metadata']['kills'],
                                    deaths: matches[m]['data']['metadata']['deaths'],
                                    assists: matches[m]['data']['metadata']['assists'],
                                })
                            } else {
                                let found = false
                                for (ac in actStats) {
                                    if (actStats[ac].act == acts[a].acts[act].id) {
                                        actStats[ac].count++
                                        actStats[ac].wins += winCheckNum(matches[m], puuid)
                                        actStats[ac].losses += lossCheckNum(matches[m], puuid)
                                        actStats[ac].kills += matches[m]['data']['metadata']['kills']
                                        actStats[ac].deaths += matches[m]['data']['metadata']['deaths']
                                        actStats[ac].assists += matches[m]['data']['metadata']['assists']
                                        found = true
                                        break
                                    }
                                }
                                if (!found) {
                                    actStats.push({
                                        act: acts[a].acts[act].id,
                                        name: acts[a].name + " - " + acts[a].acts[act].name,
                                        count: 1,
                                        wins: winCheckNum(matches[m], puuid),
                                        losses: lossCheckNum(matches[m], puuid),
                                        kills: matches[m]['data']['metadata']['kills'],
                                        deaths: matches[m]['data']['metadata']['deaths'],
                                        assists: matches[m]['data']['metadata']['assists'],
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
        return actStats
    },
    getUtilUsage: async function (matches, puuid, agent) {
        let util = {
            "x_cast": 0,
            "e_cast": 0,
            "q_cast": 0,
            "c_cast": 0
        }
        let roundCount = 0
        let matchCount = 0
        if (agent) {
            matchCount = 0
            for (let match of matches) {
                for (let player of match['data']['players']['all_players']) {
                    if (player.puuid == puuid) {
                        if (player.character == agent) {
                            matchCount++
                            util.x_cast += player.ability_casts.x_cast
                            util.e_cast += player.ability_casts.e_cast
                            util.q_cast += player.ability_casts.q_cast
                            util.c_cast += player.ability_casts.c_cast
                            if (player.behavior.rounds_in_spawn < 1) {
                                roundCount += (match.data.metadata.rounds_played - player.behavior.afk_rounds)
                            } else {
                                roundCount += (match.data.metadata.rounds_played - player.behavior.afk_rounds - player.behavior.rounds_in_spawn)
                            }
                        }
                    }
                }
            }
        } else {
            matchCount = matches.length
            for (let match of matches) {
                for (let player of match['data']['players']['all_players']) {
                    if (player.puuid == puuid) {
                        util.x_cast += player.ability_casts.x_cast
                        util.e_cast += player.ability_casts.e_cast
                        util.q_cast += player.ability_casts.q_cast
                        util.c_cast += player.ability_casts.c_cast
                        if (player.behavior.rounds_in_spawn < 1) {
                            roundCount += (match.data.metadata.rounds_played - player.behavior.afk_rounds)
                        } else {
                            roundCount += (match.data.metadata.rounds_played - player.behavior.afk_rounds - player.behavior.rounds_in_spawn)
                        }
                    }
                }
            }
        }
        let utilUsage = {
            util,
            utilPerRound: {
                x_cast: util.x_cast / roundCount,
                e_cast: util.e_cast / roundCount,
                q_cast: util.q_cast / roundCount,
                c_cast: util.c_cast / roundCount
            },
            utilPerMatch: {
                x_cast: util.x_cast / matchCount,
                e_cast: util.e_cast / matchCount,
                q_cast: util.q_cast / matchCount,
                c_cast: util.c_cast / matchCount
            }
        }
        return utilUsage
    },
    calculateClutches: async function (matches, playerPUUID) {
        const clutchCounts = {
            '1v2': 0,
            '1v3': 0,
            '1v4': 0,
            '1v5': 0,
            '1v6': 0,
            '1v7': 0,
        };

        matches.forEach(match => {
            createKillEvents(match.data.rounds); // Prepare kill events

            match.data.rounds.forEach(round => {
                const playerStats = round.player_stats.find(p => p.player_puuid === playerPUUID);
                if (!playerStats) return;

                const playerTeam = playerStats.player_team;

                // Create arrays for alive teammates and enemies
                const aliveTeammates = round.player_stats
                    .filter(p => p.player_team === playerTeam && p.player_puuid !== playerPUUID)
                    .map(p => p.player_puuid);

                const aliveEnemies = round.player_stats
                    .filter(p => p.player_team !== playerTeam)
                    .map(p => p.player_puuid);

                let lastTeammateDeathIndex = -1;

                // Process kill events to track deaths
                for (let index = 0; index < round.kill_events.length; index++) {
                    const event = round.kill_events[index];

                    if (aliveTeammates.includes(event.victim_puuid)) {
                        // Remove killed teammate
                        aliveTeammates.splice(aliveTeammates.indexOf(event.victim_puuid), 1);
                    }

                    if (aliveTeammates.length === 0 && lastTeammateDeathIndex === -1) {
                        // Record when the last teammate dies
                        lastTeammateDeathIndex = index;
                        break; // Stop looping since all teammates are dead
                    }

                    if (aliveEnemies.includes(event.victim_puuid)) {
                        // Remove killed enemy
                        aliveEnemies.splice(aliveEnemies.indexOf(event.victim_puuid), 1);
                    }
                }

                // Only proceed if all teammates are dead
                if (lastTeammateDeathIndex !== -1) {
                    const clutchKillEvents = round.kill_events.slice(lastTeammateDeathIndex + 1);

                    // Calculate clutch size based on alive enemies at last teammate's death
                    const clutchSize = `1v${aliveEnemies.length}`;
                    if (round.winning_team === playerTeam && clutchKillEvents.length > 0) {
                        if (clutchCounts[clutchSize] !== undefined) {
                            clutchCounts[clutchSize]++;
                        }

                        // Special cases for 1v6 and 1v7 (based on revives)
                        if (aliveEnemies.length === 6) {
                            clutchCounts['1v6']++;
                        } else if (aliveEnemies.length === 7) {
                            clutchCounts['1v7']++;
                        }
                    }
                }
            });
        });

        return clutchCounts;
    },
    getKillStreak: async function (matches, playerPUUID) {
        let longestKillStreak = 0;

        // Create a unified kill events array
        const allKillEvents = [];
        matches.forEach(match => {
            createKillEvents(match.data.rounds); // Ensure kill events are created
            match.data.rounds.forEach(round => {
                allKillEvents.push(...round.kill_events);
            });
        });

        // Sort all kill events by time to maintain chronological order
        allKillEvents.sort((a, b) => a.time - b.time);

        // Calculate the longest kill streak
        let currentStreak = 0;
        for (let i = 0; i < allKillEvents.length; i++) {
            const event = allKillEvents[i];

            if (event.killer_puuid === playerPUUID) {
                // Player got a kill; increment the current streak
                currentStreak++;
                longestKillStreak = Math.max(longestKillStreak, currentStreak);
            } else if (event.victim_puuid === playerPUUID) {
                // Player died; reset the streak
                currentStreak = 0;
            }
        }

        return longestKillStreak;
    },
    getTop5Matches: async function (matches, playerPUUID) {
        
        const top5 = {
            ACS: [],
            Kills: [],
            HeadshotPercentage: [],
        };

        matches.forEach(match => {
            const playerData = match.data.players.all_players.find(player => player.puuid === playerPUUID);
            if (!playerData) return; // Skip if player data is not found

            // Calculate ACS
            const roundsPlayed = match.data.metadata.rounds_played;
            const score = playerData.stats.score;
            const ACS = parseFloat((score / roundsPlayed).toFixed(1));

            // Retrieve kills
            const kills = playerData.stats.kills;

            // Calculate headshot percentage
            const headshots = playerData.stats.headshots;
            const bodyshots = playerData.stats.bodyshots;
            const legshots = playerData.stats.legshots;
            const totalShots = headshots + bodyshots + legshots;
            const headshotPercentage = totalShots > 0
                ? parseFloat(((headshots / totalShots) * 100).toFixed(1))
                : 0;

            // Get match ID and agent played
            const matchId = match.data.metadata.matchid;
            const agent = playerData.character;

            // Add match data to respective categories
            top5.ACS.push({ matchId, agent, value: ACS });
            top5.Kills.push({ matchId, agent, value: kills });
            top5.HeadshotPercentage.push({ matchId, agent, value: headshotPercentage });
        });

        // Sort each category and retain the top 5 matches
        top5.ACS.sort((a, b) => b.value - a.value).splice(5);
        top5.Kills.sort((a, b) => b.value - a.value).splice(5);
        top5.HeadshotPercentage.sort((a, b) => b.value - a.value).splice(5);

        return top5;
    }
};

module.exports = UserFunctions;