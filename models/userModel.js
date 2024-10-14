const { PrismaClient } = require('@prisma/client');
const { tr } = require('date-fns/locale');
const { json } = require('express');
const prisma = new PrismaClient();
const fs = require('fs');
const apiFunctions = require('./valAPI.js');
const processFunctions = require("./processModel")
const DatabaseFunctions = require("./databaseModel");
const { name } = require('ejs');
const { kill } = require('process');


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
            }
            else {
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
                }
                else {
                    return 0
                }
            }
            else {
                if (match['data']['teams']['blue']['has_won']) {
                    return 1
                }
                else {
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
                }
                else {
                    return 1
                }
            }
            else {
                if (match['data']['teams']['blue']['has_won']) {
                    return 0
                }
                else {
                    return 1
                }
            }
        }
    }
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
                }
                else if (matches[m]['data']['metadata']['result'] == 'Loss') {
                    overall.losses++
                }
                else {
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
                }
                else if (matches[m]['data']['metadata']['result'] == 'Loss') {
                    overall.losses++
                }
                else {
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
                        count: 1,
                        wins: 1,
                        losses: 0,
                        draws: 0,
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
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                }
                else if (matches[m]['data']['metadata']['result'] == "Loss") {
                    let input = {
                        agent: matches[m]['data']['metadata']['agent'],
                        count: 1,
                        wins: 0,
                        losses: 1,
                        draws: 0,
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
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                }
                else {
                    let input = {
                        agent: matches[m]['data']['metadata']['agent'],
                        count: 1,
                        wins: 0,
                        losses: 0,
                        draws: 1,
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
                        }
                    }
                    input.maps[matches[m]['data']['metadata']['map']]++
                    agents.push(input)
                }
            }
            else {
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
                        }
                        else if (matches[m]['data']['metadata']['result'] == "Loss") {
                            agents[a].losses++
                            agents[a].maps[matches[m]['data']['metadata']['map']]++
                        }
                        else {
                            agents[a].draws++
                            agents[a].maps[matches[m]['data']['metadata']['map']]++
                        }
                        found = true
                    }
                }
                if (!found) {
                    if (matches[m]['data']['metadata']['result'] == "Win") {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 1,
                            losses: 0,
                            draws: 0,
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
                            }
                        }
                        input.maps[matches[m]['data']['metadata']['map']]++
                        agents.push(input)
                    }
                    else if (matches[m]['data']['metadata']['result'] == "Loss") {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 1,
                            draws: 0,
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
                            }
                        }
                        input.maps[matches[m]['data']['metadata']['map']]++
                        agents.push(input)
                    }
                    else {
                        let input = {
                            agent: matches[m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 0,
                            draws: 1,
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
            }
            else if (matches[m]['data']['metadata']['result'] == "Loss") {
                maps_played[matches[m]['data']['metadata']['map']].count++
                maps_played[matches[m]['data']['metadata']['map']].kills += matches[m]['data']['metadata']['kills']
                maps_played[matches[m]['data']['metadata']['map']].deaths += matches[m]['data']['metadata']['deaths']
                maps_played[matches[m]['data']['metadata']['map']].assists += matches[m]['data']['metadata']['assists']
                maps_played[matches[m]['data']['metadata']['map']].losses++

            }
            else {
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
                        })
                    }
                    else {
                        let found = false
                        for (pl in teammates) {
                            if (teammates[pl].puuid == matches[m]['data']['players'][userteam][tm]['puuid']) {
                                teammates[pl].count++
                                teammates[pl].wins += winCheckNum(matches[m], puuid)
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
                        }
                        else {
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
                }
                else {
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
                            }
                            else {
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
    }
};

module.exports = UserFunctions;
