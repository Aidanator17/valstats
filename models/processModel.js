const fs = require('fs');
const apiFunctions = require('../models/valAPI.js');
const DatabaseFunctions = require("../models/databaseModel");
const { el } = require('date-fns/locale');
const { count } = require('console');


function compare_score(a, b) {
    if (a['stats']['score'] < b['stats']['score']) {
        return 1;
    }
    if (a['stats']['score'] > b['stats']['score']) {
        return -1;
    }
    return 0;
}

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

function checkObject(vlue, prpt, lst) {
    for (x in lst) {
        if (lst[x][prpt] == vlue) {
            // console.log(`Found ${vlue}!`)
            return [true, x]
        }
    }
    // console.log(`Didnt find ${vlue}!`)
    return [false, null]
}

function getAgentRole(agentName) {
    // Convert agentName to lowercase to avoid case sensitivity issues
    agentName = agentName.toLowerCase();

    const agentRoles = {
        "brimstone": "Controller",
        "viper": "Controller",
        "omen": "Controller",
        "astra": "Controller",
        "harbor": "Controller",
        "clove": "Controller",
        "killjoy": "Sentinel",
        "cypher": "Sentinel",
        "sage": "Sentinel",
        "chamber": "Sentinel",
        "deadlock": "Sentinel",
        "vyse": "Sentinel",
        "phoenix": "Duelist",
        "jett": "Duelist",
        "reyna": "Duelist",
        "raze": "Duelist",
        "yoru": "Duelist",
        "neon": "Duelist",
        "iso": "Duelist",
        "sova": "Initiator",
        "skye": "Initiator",
        "breach": "Initiator",
        "kay/o": "Initiator",
        "fade": "Initiator",
        "gekko": "Initiator",
    };
    // console.log(`${agentName} => ${agentRoles[agentName]}`)
    return agentRoles[agentName] || "Unknown Role";
}
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
function compare_count(a, b) {
    if (a.count < b.count) {
        return 1;
    }
    if (a.count > b.count) {
        return -1;
    }
    return 0;
}
function agentCheck(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            return match['data']['players']['all_players'][p]['character']
        }
    }
}
function winCheck(match, puuid) {
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            if (match['data']['players']['all_players'][p]['team'] == 'Red') {
                if (match['data']['teams']['red']['has_won']) {
                    return true
                }
                else {
                    return false
                }
            }
            else {
                if (match['data']['teams']['blue']['has_won']) {
                    return true
                }
                else {
                    return false
                }
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
function pickRandomColor(colors) {
    if (colors.length === 0) {
        return null; // If no colors are left, return null
    }

    // Generate a random index based on the current length of the colors array
    const randomIndex = Math.floor(Math.random() * colors.length);

    // Remove the color at the random index and return it
    const pickedColor = colors.splice(randomIndex, 1)[0];

    return pickedColor;
}
function combineUserStats(data) {
    const combinedData = {
        userList: data.userList,
        accounts: data.accounts,
        allStats: {
            overall: {
                hs: 0,
                bs: 0,
                ls: 0,
                HSP: 0,
                kills: 0,
                deaths: 0,
                KD: 0,
                wins: 0,
                losses: 0,
                wp: 0
            },
            teammates: [],
            agents: [],
            maps_played: [],
            img0: "",
            lvl0: 0,
            current_rank0: "",
            peak_rank0: {}
        },
        comp_matches: [],
        matches: []
    };

    let agentMap = {};
    let teammatesMap = {};
    let mapsPlayedMap = {};
    let accountCount = data.accounts.length;

    // Loop through each account to combine data
    data.accounts.forEach((account, idx) => {
        let stats = account.stats.overall;
        for (m in account.comp_matches) {
            account.comp_matches[m].color = account.userColor
        }
        for (m in account.matches) {
            account.matches[m].color = account.userColor
        }
        combinedData.comp_matches = combinedData.comp_matches.concat(account.comp_matches)
        combinedData.matches = combinedData.matches.concat(account.matches)
        // Aggregate overall stats
        combinedData.allStats.overall.hs += stats.hs;
        combinedData.allStats.overall.bs += stats.bs;
        combinedData.allStats.overall.ls += stats.ls;
        combinedData.allStats.overall.kills += stats.kills;
        combinedData.allStats.overall.deaths += stats.deaths;
        combinedData.allStats.overall.wins += stats.wins;
        combinedData.allStats.overall.losses += stats.losses;

        // Add the image, level, rank, etc.
        combinedData.allStats[`img${idx}`] = account.img;
        combinedData.allStats[`lvl${idx}`] = account.lvl;
        combinedData.allStats[`current_rank${idx}`] = account.current_rank;
        combinedData.allStats[`peak_rank${idx}`] = account.peak_rank;

        // Combine agent data
        account.agents.forEach(agent => {
            if (!agentMap[agent.agent]) {
                agentMap[agent.agent] = { ...agent };
            } else {
                agentMap[agent.agent].count += agent.count;
                agentMap[agent.agent].wins += agent.wins;
                agentMap[agent.agent].losses += agent.losses;
                agentMap[agent.agent].draws += agent.draws;
                agentMap[agent.agent].kills += agent.kills;
                agentMap[agent.agent].deaths += agent.deaths;
                agentMap[agent.agent].assists += agent.assists;

                Object.keys(agent.maps).forEach(map => {
                    agentMap[agent.agent].maps[map] += agent.maps[map];
                });
            }
        });

        // Combine teammate data
        account.teammates.forEach(teammate => {
            if (!teammatesMap[teammate.puuid]) {
                teammatesMap[teammate.puuid] = { ...teammate };
            } else {
                teammatesMap[teammate.puuid].count += teammate.count;
                teammatesMap[teammate.puuid].wins += teammate.wins;
            }
        });

        // Combine maps played
        account.maps_played.forEach(map => {
            if (!mapsPlayedMap[map.name]) {
                mapsPlayedMap[map.name] = { ...map };
            } else {
                mapsPlayedMap[map.name].count += map.count;
                mapsPlayedMap[map.name].wins += map.wins;
                mapsPlayedMap[map.name].losses += map.losses;
                mapsPlayedMap[map.name].draws += map.draws;
                mapsPlayedMap[map.name].kills += map.kills;
                mapsPlayedMap[map.name].deaths += map.deaths;
                mapsPlayedMap[map.name].assists += map.assists;
            }
        });
    });

    // Calculate final HSP, KD, and wp using total stats
    let totalHs = combinedData.allStats.overall.hs;
    let totalBs = combinedData.allStats.overall.bs;
    let totalLs = combinedData.allStats.overall.ls;
    let totalKills = combinedData.allStats.overall.kills;
    let totalDeaths = combinedData.allStats.overall.deaths;
    let totalWins = combinedData.allStats.overall.wins;
    let totalLosses = combinedData.allStats.overall.losses;

    combinedData.allStats.overall.HSP = Math.round((totalHs / (totalBs + totalHs + totalLs)) * 1000) / 10;
    combinedData.allStats.overall.KD = Math.round((totalKills / totalDeaths) * 100) / 100;
    combinedData.allStats.overall.wp = Math.round((totalWins / (totalWins + totalLosses)) * 1000) / 10;

    // Convert agent map, teammates map, and maps played map to arrays
    combinedData.allStats.agents = Object.values(agentMap);
    combinedData.allStats.teammates = Object.values(teammatesMap);
    combinedData.allStats.maps_played = Object.values(mapsPlayedMap);

    return combinedData;
}
function player_match_stats(match, puuid) {
    let stats = {
        score: 0,
        rounds: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        bodyshots: 0,
        legshots: 0,
        agent: agentCheck(match, puuid),
        role: getAgentRole(agentCheck(match, puuid)).toLowerCase(),
        win: winCheck(match, puuid)
    }
    for (p in match['data']['players']['all_players']) {
        if (match['data']['players']['all_players'][p]['puuid'] == puuid) {
            stats.score = match['data']['players']['all_players'][p]['stats']['score']
            stats.rounds = match['data']['metadata']['rounds_played']
            stats.kills = match['data']['players']['all_players'][p]['stats']['kills']
            stats.deaths = match['data']['players']['all_players'][p]['stats']['deaths']
            stats.assists = match['data']['players']['all_players'][p]['stats']['assists']
            stats.headshots = match['data']['players']['all_players'][p]['stats']['headshots']
            stats.bodyshots = match['data']['players']['all_players'][p]['stats']['bodyshots']
            stats.legshots = match['data']['players']['all_players'][p]['stats']['legshots']
        }
    }
    return stats
}
async function formatComp(comps, team) {
    let comp = []
    let comp_images = []
    for (p in team) {
        comp.push(team[p]['character'])
        comp_images.push(team[p]['assets']['agent']['small'])
    }
    comp.sort()
    if (comps.length == 0) {
        return {
            agents: comp,
            agent_imgs: comp_images,
            count: 1
        }
    }
    else {
        for (let c in comps) {
            // Sort both arrays to ensure they are compared in the same order
            // console.log(typeof comps[c])
            const agents1 = [...comps[c].agents].sort();
            const agents2 = [...comp].sort();
            
            // Check if they have the same length and elements
            const areEqual = agents1.length === agents2.length &&
                             agents1.every((agent, index) => agent === agents2[index]);
        
            if (areEqual) {
                // console.log(c)
                return parseInt(c); // Return index if the arrays are the same
            }
        }
        
        return {
            agents: comp,
            agent_imgs: comp_images,
            count: 1
        }
    }
}
function isEven(n) {
    return n % 2 == 0;
}
function getAttkDefWins(match) {
    let attkWins = 0
    let defWins = 0
    const rounds = match['data']['rounds']
    for (r in rounds) {
        if (r < 12) {
            if (rounds[r]['winning_team'] == "Red") {
                attkWins++
            }
            else {
                defWins++
            }
        }
        else if (r < 24) {
                if (rounds[r]['winning_team'] == "Red") {
                    defWins++
                }
                else {
                    attkWins++
                }
        }
        else if (isEven(r)) {
            if (rounds[r]['winning_team'] == "Red") {
                attkWins++
            }
            else {
                defWins++
            }
        }
        else {
            if (rounds[r]['winning_team'] == "Red") {
                defWins++
            }
            else {
                attkWins++
            }
        }
    }
    return [attkWins, defWins]
}
function isNumber(value) {
    return typeof value === 'number';
}


const processFunctions = {
    get_agent_stats: async function (agent, matches, actId) {
        let agentData = {
            kills: 0,
            deaths: 0,
            assists: 0,
            picks: 0,
            headshots: 0,
            bodyshots: 0,
            legshots: 0,
            maps: {
                "Abyss": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Ascent": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Bind": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Breeze": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Fracture": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Haven": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Icebox": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Lotus": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Pearl": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Split": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
                "Sunset": {
                    picks: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0
                },
            },
            wins: 0,
            losses: 0,
            draws: 0,
            by_rank: {}
        };

        const rankOrder = [
            "Unrated",
            "Iron 1", "Iron 2", "Iron 3",
            "Bronze 1", "Bronze 2", "Bronze 3",
            "Silver 1", "Silver 2", "Silver 3",
            "Gold 1", "Gold 2", "Gold 3",
            "Platinum 1", "Platinum 2", "Platinum 3",
            "Diamond 1", "Diamond 2", "Diamond 3",
            "Ascendant 1", "Ascendant 2", "Ascendant 3",
            "Immortal 1", "Immortal 2", "Immortal 3",
            "Radiant"
        ];

        // Initialize the by_rank object in the correct order
        rankOrder.forEach(rank => {
            let imageName;
            if (rank === "Unrated") {
                imageName = "Unrated_undefined_Rank.png";
            } else {
                imageName = rank.replace(' ', '_') + "_Rank.png";
            }

            agentData.by_rank[rank] = {
                kills: 0,
                deaths: 0,
                assists: 0,
                picks: 0,
                headshots: 0,
                bodyshots: 0,
                legshots: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                image_name: imageName
            };
        });


        let agentImage = '';
        if (actId) {
            for (let m in matches) {
                if (matches[m]['data']['metadata']['season_id'] == actId) {
                    let bWinner = false;
                    let rWinner = false;
                    let draw = false;
                    let rExists = false;
                    let bExists = false;
                    let rRank = '';
                    let bRank = '';

                    if (matches[m]['data']['teams']['red']['has_won']) {
                        rWinner = true;
                    } else if (matches[m]['data']['teams']['blue']['has_won']) {
                        bWinner = true;
                    } else {
                        draw = true;
                    }

                    for (let p in matches[m]['data']['players']['red']) {
                        if (matches[m]['data']['players']['red'][p]['character'] === agent) {
                            rRank = matches[m]['data']['players']['red'][p]['currenttier_patched'];

                            // Initialize rank in by_rank if it doesn't exist
                            if (!agentData.by_rank[rRank]) {
                                agentData.by_rank[rRank] = {
                                    kills: 0,
                                    deaths: 0,
                                    assists: 0,
                                    picks: 0,
                                    headshots: 0,
                                    bodyshots: 0,
                                    legshots: 0,
                                    wins: 0,
                                    losses: 0,
                                    draws: 0,
                                    image_name: `${rRank.replace(/ /g, "_")}_Rank.png`
                                };
                            }

                            // Update rank stats
                            agentData.by_rank[rRank].picks++;
                            agentData.by_rank[rRank].kills += matches[m]['data']['players']['red'][p]['stats']['kills'];
                            agentData.by_rank[rRank].deaths += matches[m]['data']['players']['red'][p]['stats']['deaths'];
                            agentData.by_rank[rRank].assists += matches[m]['data']['players']['red'][p]['stats']['assists'];
                            agentData.by_rank[rRank].headshots += matches[m]['data']['players']['red'][p]['stats']['headshots'];
                            agentData.by_rank[rRank].bodyshots += matches[m]['data']['players']['red'][p]['stats']['bodyshots'];
                            agentData.by_rank[rRank].legshots += matches[m]['data']['players']['red'][p]['stats']['legshots'];

                            // Update general stats
                            agentImage = matches[m]['data']['players']['red'][p]['assets']['agent']['small'];
                            rExists = true;
                            agentData.picks++;
                            agentData.kills += matches[m]['data']['players']['red'][p]['stats']['kills'];
                            agentData.deaths += matches[m]['data']['players']['red'][p]['stats']['deaths'];
                            agentData.assists += matches[m]['data']['players']['red'][p]['stats']['assists'];
                            agentData.headshots += matches[m]['data']['players']['red'][p]['stats']['headshots'];
                            agentData.bodyshots += matches[m]['data']['players']['red'][p]['stats']['bodyshots'];
                            agentData.legshots += matches[m]['data']['players']['red'][p]['stats']['legshots'];
                            agentData.maps[matches[m]['data']['metadata']['map']].picks++;

                            // Update win/loss/draw stats immediately after confirming agent pick
                            if (rWinner) {
                                agentData.by_rank[rRank].wins++;
                                agentData.wins++;
                                agentData.maps[matches[m]['data']['metadata']['map']].wins++;
                            } else if (bWinner) {
                                agentData.by_rank[rRank].losses++;
                                agentData.losses++;
                                agentData.maps[matches[m]['data']['metadata']['map']].losses++;
                            } else {
                                agentData.by_rank[rRank].draws++;
                                agentData.draws++;
                                agentData.maps[matches[m]['data']['metadata']['map']].draws++;
                            }
                        }
                    }

                    for (let p in matches[m]['data']['players']['blue']) {
                        if (matches[m]['data']['players']['blue'][p]['character'] === agent) {
                            bRank = matches[m]['data']['players']['blue'][p]['currenttier_patched'];

                            // Initialize rank in by_rank if it doesn't exist
                            if (!agentData.by_rank[bRank]) {
                                agentData.by_rank[bRank] = {
                                    kills: 0,
                                    deaths: 0,
                                    assists: 0,
                                    picks: 0,
                                    headshots: 0,
                                    bodyshots: 0,
                                    legshots: 0,
                                    wins: 0,
                                    losses: 0,
                                    draws: 0,
                                    image_name: `${bRank.replace(/ /g, "_")}_Rank.png`
                                };
                            }

                            // Update rank stats
                            agentData.by_rank[bRank].picks++;
                            agentData.by_rank[bRank].kills += matches[m]['data']['players']['blue'][p]['stats']['kills'];
                            agentData.by_rank[bRank].deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths'];
                            agentData.by_rank[bRank].assists += matches[m]['data']['players']['blue'][p]['stats']['assists'];
                            agentData.by_rank[bRank].headshots += matches[m]['data']['players']['blue'][p]['stats']['headshots'];
                            agentData.by_rank[bRank].bodyshots += matches[m]['data']['players']['blue'][p]['stats']['bodyshots'];
                            agentData.by_rank[bRank].legshots += matches[m]['data']['players']['blue'][p]['stats']['legshots'];

                            // Update general stats
                            bExists = true;
                            agentData.picks++;
                            agentData.kills += matches[m]['data']['players']['blue'][p]['stats']['kills'];
                            agentData.deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths'];
                            agentData.assists += matches[m]['data']['players']['blue'][p]['stats']['assists'];
                            agentData.headshots += matches[m]['data']['players']['blue'][p]['stats']['headshots'];
                            agentData.bodyshots += matches[m]['data']['players']['blue'][p]['stats']['bodyshots'];
                            agentData.legshots += matches[m]['data']['players']['blue'][p]['stats']['legshots'];
                            agentData.maps[matches[m]['data']['metadata']['map']].picks++;

                            // Update win/loss/draw stats immediately after confirming agent pick
                            if (bWinner) {
                                agentData.by_rank[bRank].wins++;
                                agentData.wins++;
                                agentData.maps[matches[m]['data']['metadata']['map']].wins++;
                            } else if (rWinner) {
                                agentData.by_rank[bRank].losses++;
                                agentData.losses++;
                                agentData.maps[matches[m]['data']['metadata']['map']].losses++;
                            } else {
                                agentData.by_rank[bRank].draws++;
                                agentData.draws++;
                                agentData.maps[matches[m]['data']['metadata']['map']].draws++;
                            }
                        }
                    }
                }
            }
        }
        else {
            for (let m in matches) {
                let bWinner = false;
                let rWinner = false;
                let draw = false;
                let rExists = false;
                let bExists = false;
                let rRank = '';
                let bRank = '';

                if (matches[m]['data']['teams']['red']['has_won']) {
                    rWinner = true;
                } else if (matches[m]['data']['teams']['blue']['has_won']) {
                    bWinner = true;
                } else {
                    draw = true;
                }

                for (let p in matches[m]['data']['players']['red']) {
                    if (matches[m]['data']['players']['red'][p]['character'] === agent) {
                        rRank = matches[m]['data']['players']['red'][p]['currenttier_patched'];

                        // Initialize rank in by_rank if it doesn't exist
                        if (!agentData.by_rank[rRank]) {
                            agentData.by_rank[rRank] = {
                                kills: 0,
                                deaths: 0,
                                assists: 0,
                                picks: 0,
                                headshots: 0,
                                bodyshots: 0,
                                legshots: 0,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                image_name: `${rRank.replace(/ /g, "_")}_Rank.png`
                            };
                        }

                        // Update rank stats
                        agentData.by_rank[rRank].picks++;
                        agentData.by_rank[rRank].kills += matches[m]['data']['players']['red'][p]['stats']['kills'];
                        agentData.by_rank[rRank].deaths += matches[m]['data']['players']['red'][p]['stats']['deaths'];
                        agentData.by_rank[rRank].assists += matches[m]['data']['players']['red'][p]['stats']['assists'];
                        agentData.by_rank[rRank].headshots += matches[m]['data']['players']['red'][p]['stats']['headshots'];
                        agentData.by_rank[rRank].bodyshots += matches[m]['data']['players']['red'][p]['stats']['bodyshots'];
                        agentData.by_rank[rRank].legshots += matches[m]['data']['players']['red'][p]['stats']['legshots'];

                        // Update general stats
                        agentImage = matches[m]['data']['players']['red'][p]['assets']['agent']['small'];
                        rExists = true;
                        agentData.picks++;
                        agentData.kills += matches[m]['data']['players']['red'][p]['stats']['kills'];
                        agentData.deaths += matches[m]['data']['players']['red'][p]['stats']['deaths'];
                        agentData.assists += matches[m]['data']['players']['red'][p]['stats']['assists'];
                        agentData.headshots += matches[m]['data']['players']['red'][p]['stats']['headshots'];
                        agentData.bodyshots += matches[m]['data']['players']['red'][p]['stats']['bodyshots'];
                        agentData.legshots += matches[m]['data']['players']['red'][p]['stats']['legshots'];
                        agentData.maps[matches[m]['data']['metadata']['map']].picks++;

                        // Update win/loss/draw stats immediately after confirming agent pick
                        if (rWinner) {
                            agentData.by_rank[rRank].wins++;
                            agentData.wins++;
                            agentData.maps[matches[m]['data']['metadata']['map']].wins++;
                        } else if (bWinner) {
                            agentData.by_rank[rRank].losses++;
                            agentData.losses++;
                            agentData.maps[matches[m]['data']['metadata']['map']].losses++;
                        } else {
                            agentData.by_rank[rRank].draws++;
                            agentData.draws++;
                            agentData.maps[matches[m]['data']['metadata']['map']].draws++;
                        }
                    }
                }

                for (let p in matches[m]['data']['players']['blue']) {
                    if (matches[m]['data']['players']['blue'][p]['character'] === agent) {
                        bRank = matches[m]['data']['players']['blue'][p]['currenttier_patched'];

                        // Initialize rank in by_rank if it doesn't exist
                        if (!agentData.by_rank[bRank]) {
                            agentData.by_rank[bRank] = {
                                kills: 0,
                                deaths: 0,
                                assists: 0,
                                picks: 0,
                                headshots: 0,
                                bodyshots: 0,
                                legshots: 0,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                image_name: `${bRank.replace(/ /g, "_")}_Rank.png`
                            };
                        }

                        // Update rank stats
                        agentData.by_rank[bRank].picks++;
                        agentData.by_rank[bRank].kills += matches[m]['data']['players']['blue'][p]['stats']['kills'];
                        agentData.by_rank[bRank].deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths'];
                        agentData.by_rank[bRank].assists += matches[m]['data']['players']['blue'][p]['stats']['assists'];
                        agentData.by_rank[bRank].headshots += matches[m]['data']['players']['blue'][p]['stats']['headshots'];
                        agentData.by_rank[bRank].bodyshots += matches[m]['data']['players']['blue'][p]['stats']['bodyshots'];
                        agentData.by_rank[bRank].legshots += matches[m]['data']['players']['blue'][p]['stats']['legshots'];

                        // Update general stats
                        bExists = true;
                        agentData.picks++;
                        agentData.kills += matches[m]['data']['players']['blue'][p]['stats']['kills'];
                        agentData.deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths'];
                        agentData.assists += matches[m]['data']['players']['blue'][p]['stats']['assists'];
                        agentData.headshots += matches[m]['data']['players']['blue'][p]['stats']['headshots'];
                        agentData.bodyshots += matches[m]['data']['players']['blue'][p]['stats']['bodyshots'];
                        agentData.legshots += matches[m]['data']['players']['blue'][p]['stats']['legshots'];
                        agentData.maps[matches[m]['data']['metadata']['map']].picks++;

                        // Update win/loss/draw stats immediately after confirming agent pick
                        if (bWinner) {
                            agentData.by_rank[bRank].wins++;
                            agentData.wins++;
                            agentData.maps[matches[m]['data']['metadata']['map']].wins++;
                        } else if (rWinner) {
                            agentData.by_rank[bRank].losses++;
                            agentData.losses++;
                            agentData.maps[matches[m]['data']['metadata']['map']].losses++;
                        } else {
                            agentData.by_rank[bRank].draws++;
                            agentData.draws++;
                            agentData.maps[matches[m]['data']['metadata']['map']].draws++;
                        }
                    }
                }
            }
        }
        return [agentData, matches.length, agentImage];
    },
    get_all_agent_stats: async function (matches, actId) {
        let output = []
        let actCount = 0
        if (actId) {
            for (m in matches) {
                if (matches[m]['data']['metadata']['season_id'] == actId) {
                    actCount++
                    let bWinner = false;
                    let rWinner = false;
                    let draw = false;

                    if (matches[m]['data']['teams']['red']['has_won']) {
                        rWinner = true;
                    } else if (matches[m]['data']['teams']['blue']['has_won']) {
                        bWinner = true;
                    } else {
                        draw = true;
                    }
                    for (p in matches[m]['data']['players']['red']) {
                        let checkList = checkObject(matches[m]['data']['players']['red'][p]["character"], 'name', output)
                        if (output.length == 0) {
                            let newInput = {
                                name: matches[m]['data']['players']['red'][p]["character"],
                                role: getAgentRole(matches[m]['data']['players']['red'][p]["character"]),
                                agentIMG: matches[m]['data']['players']['red'][p]['assets']['agent']['small'],
                                kills: matches[m]['data']['players']['red'][p]['stats']['kills'],
                                deaths: matches[m]['data']['players']['red'][p]['stats']['deaths'],
                                assists: matches[m]['data']['players']['red'][p]['stats']['assists'],
                                wins: 0,
                                losses: 0,
                                draws: 0
                            }
                            if (rWinner) {
                                newInput.wins++
                            }
                            else if (bWinner) {
                                newInput.losses++
                            }
                            else {
                                newInput.draws++
                            }
                            output.push(newInput)
                        }
                        else if (checkList[0]) {
                            output[checkList[1]].kills += matches[m]['data']['players']['red'][p]['stats']['kills']
                            output[checkList[1]].deaths += matches[m]['data']['players']['red'][p]['stats']['deaths']
                            output[checkList[1]].assists += matches[m]['data']['players']['red'][p]['stats']['assists']
                            if (rWinner) {
                                output[checkList[1]].wins++
                            }
                            else if (bWinner) {
                                output[checkList[1]].losses++
                            }
                            else {
                                output[checkList[1]].draws++
                            }
                        }
                        else {
                            let newInput = {
                                name: matches[m]['data']['players']['red'][p]["character"],
                                role: getAgentRole(matches[m]['data']['players']['red'][p]["character"]),
                                agentIMG: matches[m]['data']['players']['red'][p]['assets']['agent']['small'],
                                kills: matches[m]['data']['players']['red'][p]['stats']['kills'],
                                deaths: matches[m]['data']['players']['red'][p]['stats']['deaths'],
                                assists: matches[m]['data']['players']['red'][p]['stats']['assists'],
                                wins: 0,
                                losses: 0,
                                draws: 0
                            }
                            if (rWinner) {
                                newInput.wins++
                            }
                            else if (bWinner) {
                                newInput.losses++
                            }
                            else {
                                newInput.draws++
                            }
                            output.push(newInput)
                        }
                    }
                    for (p in matches[m]['data']['players']['blue']) {
                        let checkList = checkObject(matches[m]['data']['players']['blue'][p]["character"], 'name', output)

                        if (checkList[0]) {
                            output[checkList[1]].kills += matches[m]['data']['players']['blue'][p]['stats']['kills']
                            output[checkList[1]].deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths']
                            output[checkList[1]].assists += matches[m]['data']['players']['blue'][p]['stats']['assists']
                            if (bWinner) {
                                output[checkList[1]].wins++
                            }
                            else if (rWinner) {
                                output[checkList[1]].losses++
                            }
                            else {
                                output[checkList[1]].draws++
                            }
                        }
                        else {
                            let newInput = {
                                name: matches[m]['data']['players']['blue'][p]["character"],
                                role: getAgentRole(matches[m]['data']['players']['blue'][p]["character"]),
                                agentIMG: matches[m]['data']['players']['blue'][p]['assets']['agent']['small'],
                                kills: matches[m]['data']['players']['blue'][p]['stats']['kills'],
                                deaths: matches[m]['data']['players']['blue'][p]['stats']['deaths'],
                                assists: matches[m]['data']['players']['blue'][p]['stats']['assists'],
                                wins: 0,
                                losses: 0,
                                draws: 0
                            }
                            if (bWinner) {
                                newInput.wins++
                            }
                            else if (rWinner) {
                                newInput.losses++
                            }
                            else {
                                newInput.draws++
                            }
                            output.push(newInput)
                        }
                    }
                }
            }
        }
        else {
            for (m in matches) {
                let bWinner = false;
                let rWinner = false;
                let draw = false;

                if (matches[m]['data']['teams']['red']['has_won']) {
                    rWinner = true;
                } else if (matches[m]['data']['teams']['blue']['has_won']) {
                    bWinner = true;
                } else {
                    draw = true;
                }
                for (p in matches[m]['data']['players']['red']) {
                    let checkList = checkObject(matches[m]['data']['players']['red'][p]["character"], 'name', output)
                    if (output.length == 0) {
                        let newInput = {
                            name: matches[m]['data']['players']['red'][p]["character"],
                            role: getAgentRole(matches[m]['data']['players']['red'][p]["character"]),
                            agentIMG: matches[m]['data']['players']['red'][p]['assets']['agent']['small'],
                            kills: matches[m]['data']['players']['red'][p]['stats']['kills'],
                            deaths: matches[m]['data']['players']['red'][p]['stats']['deaths'],
                            assists: matches[m]['data']['players']['red'][p]['stats']['assists'],
                            wins: 0,
                            losses: 0,
                            draws: 0
                        }
                        if (rWinner) {
                            newInput.wins++
                        }
                        else if (bWinner) {
                            newInput.losses++
                        }
                        else {
                            newInput.draws++
                        }
                        output.push(newInput)
                    }
                    else if (checkList[0]) {
                        output[checkList[1]].kills += matches[m]['data']['players']['red'][p]['stats']['kills']
                        output[checkList[1]].deaths += matches[m]['data']['players']['red'][p]['stats']['deaths']
                        output[checkList[1]].assists += matches[m]['data']['players']['red'][p]['stats']['assists']
                        if (rWinner) {
                            output[checkList[1]].wins++
                        }
                        else if (bWinner) {
                            output[checkList[1]].losses++
                        }
                        else {
                            output[checkList[1]].draws++
                        }
                    }
                    else {
                        let newInput = {
                            name: matches[m]['data']['players']['red'][p]["character"],
                            role: getAgentRole(matches[m]['data']['players']['red'][p]["character"]),
                            agentIMG: matches[m]['data']['players']['red'][p]['assets']['agent']['small'],
                            kills: matches[m]['data']['players']['red'][p]['stats']['kills'],
                            deaths: matches[m]['data']['players']['red'][p]['stats']['deaths'],
                            assists: matches[m]['data']['players']['red'][p]['stats']['assists'],
                            wins: 0,
                            losses: 0,
                            draws: 0
                        }
                        if (rWinner) {
                            newInput.wins++
                        }
                        else if (bWinner) {
                            newInput.losses++
                        }
                        else {
                            newInput.draws++
                        }
                        output.push(newInput)
                    }
                }
                for (p in matches[m]['data']['players']['blue']) {
                    let checkList = checkObject(matches[m]['data']['players']['blue'][p]["character"], 'name', output)

                    if (checkList[0]) {
                        output[checkList[1]].kills += matches[m]['data']['players']['blue'][p]['stats']['kills']
                        output[checkList[1]].deaths += matches[m]['data']['players']['blue'][p]['stats']['deaths']
                        output[checkList[1]].assists += matches[m]['data']['players']['blue'][p]['stats']['assists']
                        if (bWinner) {
                            output[checkList[1]].wins++
                        }
                        else if (rWinner) {
                            output[checkList[1]].losses++
                        }
                        else {
                            output[checkList[1]].draws++
                        }
                    }
                    else {
                        let newInput = {
                            name: matches[m]['data']['players']['blue'][p]["character"],
                            role: getAgentRole(matches[m]['data']['players']['blue'][p]["character"]),
                            agentIMG: matches[m]['data']['players']['blue'][p]['assets']['agent']['small'],
                            kills: matches[m]['data']['players']['blue'][p]['stats']['kills'],
                            deaths: matches[m]['data']['players']['blue'][p]['stats']['deaths'],
                            assists: matches[m]['data']['players']['blue'][p]['stats']['assists'],
                            wins: 0,
                            losses: 0,
                            draws: 0
                        }
                        if (bWinner) {
                            newInput.wins++
                        }
                        else if (rWinner) {
                            newInput.losses++
                        }
                        else {
                            newInput.draws++
                        }
                        output.push(newInput)
                    }
                }
            }
        }
        if (actId) {
            return [output, actCount]
        }
        else {
            return output
        }
    },
    alterMatch: async function (match, puuid, editPlayers) {
        if (match['data']['metadata']['mode_id'] == 'deathmatch') {
            for (player in match['data']['players']['all_players']) {
                if (match['data']['players']['all_players'][player]['puuid'] == puuid) {
                    match['data']['metadata']['agent'] = match['data']['players']['all_players'][player]['character']
                }
            }

        }
        else {
            match['data']['players']['blue'].sort(compare_score)
            match['data']['players']['red'].sort(compare_score)
            let playerteam
            for (player in match['data']['players']['all_players']) {
                if (match['data']['players']['all_players'][player]['puuid'] == puuid) {
                    playerteam = match['data']['players']['all_players'][player]['team']
                    match['data']['metadata']['agent'] = match['data']['players']['all_players'][player]['character']
                    match['data']['metadata']['name'] = match['data']['players']['all_players'][player]['name']
                    let rank = match['data']['players']['all_players'][player]['currenttier_patched'].split(' ')
                    match['data']['metadata']['player_rank'] = rank[0] + '_' + rank[1]
                    match['data']['metadata']['tag'] = match['data']['players']['all_players'][player]['tag']
                    let kills = match['data']['players']['all_players'][player]['stats']['kills']
                    let deaths = match['data']['players']['all_players'][player]['stats']['deaths']
                    let assists = match['data']['players']['all_players'][player]['stats']['assists']
                    let headshots = match['data']['players']['all_players'][player]['stats']['headshots']
                    let bodyshots = match['data']['players']['all_players'][player]['stats']['bodyshots']
                    let legshots = match['data']['players']['all_players'][player]['stats']['legshots']
                    match['data']['metadata']['kd'] = Math.round((kills / deaths) * 100) / 100
                    match['data']['metadata']['kills'] = kills
                    match['data']['metadata']['deaths'] = deaths
                    match['data']['metadata']['assists'] = assists
                    if ((headshots + legshots + bodyshots) == 0) {
                        match['data']['metadata']['HSP'] = Math.round((headshots / 1) * 1000) / 10
                    }
                    else {
                        match['data']['metadata']['HSP'] = Math.round((headshots / (headshots + legshots + bodyshots)) * 1000) / 10
                    }
                    match['data']['metadata']['user_agent_imgs'] = match['data']['players']['all_players'][player]['assets']['agent']
                    break
                }
            }
            if (editPlayers) {
                for (p in match['data']['players']['blue']) {
                    let words = match['data']['players']['blue'][p]['currenttier_patched'].split(' ')
                    match['data']['players']['blue'][p]['currenttier_patched'] = words[0] + '_' + words[1]
                    // let updateddata = await this.getBasic_by_puuid(match['data']['players']['blue'][p]['puuid'])
                    // match['data']['players']['blue'][p]['current_name'] = updateddata['username']
                    // match['data']['players']['blue'][p]['current_tag'] = updateddata['tag']
                }
                for (p in match['data']['players']['red']) {
                    let words = match['data']['players']['red'][p]['currenttier_patched'].split(' ')
                    match['data']['players']['red'][p]['currenttier_patched'] = words[0] + '_' + words[1]
                    // let updateddata = await this.getBasic_by_puuid(match['data']['players']['red'][p]['puuid'])
                    // match['data']['players']['red'][p]['current_name'] = updateddata['username']
                    // match['data']['players']['red'][p]['current_tag'] = updateddata['tag']
                }
            }

            let redscore = match['data']['teams']['red']['rounds_won']
            let bluescore = match['data']['teams']['blue']['rounds_won']
            if (redscore > bluescore) {
                if (playerteam == 'Red') {
                    match['data']['metadata']['result'] = 'Win'
                    match['data']['metadata']['score'] = redscore + '-' + bluescore
                }
                else {
                    match['data']['metadata']['result'] = 'Loss'
                    match['data']['metadata']['score'] = redscore + '-' + bluescore
                }
            }
            else if (bluescore > redscore) {
                if (playerteam == 'Blue') {
                    match['data']['metadata']['result'] = 'Win'
                    match['data']['metadata']['score'] = bluescore + '-' + redscore
                }
                else {
                    match['data']['metadata']['result'] = 'Loss'
                    match['data']['metadata']['score'] = bluescore + '-' + redscore
                }
            }
            else {
                match['data']['metadata']['result'] = 'Draw'
                match['data']['metadata']['score'] = bluescore + '-' + redscore
            }
        }

        return match
    },
    get_map_pickrate: async function (matches, actId) {
        let start = Date.now()
        let maps = {}
        if (actId) {
            for (m in matches) {
                if (matches[m]['data']['metadata']['season_id'] == actId) {
                    if (maps[matches[m]['data']['metadata']['map']]) {
                        maps[matches[m]['data']['metadata']['map']].count++
                    }
                    else {
                        maps[matches[m]['data']['metadata']['map']] = {
                            count: 1
                        }
                    }
                }
            }
        }
        else {
            for (m in matches) {
                if (maps[matches[m]['data']['metadata']['map']]) {
                    maps[matches[m]['data']['metadata']['map']].count++
                }
                else {
                    maps[matches[m]['data']['metadata']['map']] = {
                        count: 1
                    }
                }

            }
        }
        let end = Date.now()
        // createJSON("map_pickrate.json",maps)
        // console.log(`Retrieved pickrates (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
        return maps
    },
    get_user_data: async function (uN, tG, ifBatch) {
        let indent = `    `
        let topIndent = ``
        if (ifBatch) {
            indent = `        `
            topIndent = `    `
        }
        console.log(`${topIndent}Attempting to retrieve data for ${uN}#${tG}`)
        let start = Date.now()
        let og = Date.now()


        let UserInfo = {
            username: uN,
            tag: tG,
            comp_matches: [],
            matches: [],
            stats: {
                overall: {},
                past5: {}
            },
            teammates: [],
            agents: [],
            maps_played: {
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
        }
        const info = await apiFunctions.getBasic(uN, tG)
        if (info.puuid == '404_error') {
            console.log(`${topIndent}User not found. Redirecting.`)
            return false
        }
        else {
            let end = Date.now()
            console.log(indent + `Retrieved basic data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

            let checker = await DatabaseFunctions.check_player(info.puuid)
            let exist = checker[0]
            let pid = checker[1]
            if (!exist) {
                const addplayer = await DatabaseFunctions.create_player(info.puuid)
                console.log(indent + `Player Added To Database`)
                checker = await DatabaseFunctions.check_player(info.puuid)
                pid = checker[1]
            }

            UserInfo.username = info.username
            UserInfo.tag = info.tag
            UserInfo['puuid'] = info.puuid
            UserInfo['img'] = info.small_card
            UserInfo['lvl'] = info.acc_lvl
            UserInfo['region'] = info.reg
            UserInfo['current_rank'] = info.current_rank
            UserInfo['peak_rank'] = info.peak_rank

            start = Date.now()
            let matchlist = await apiFunctions.getMatchList(UserInfo['puuid'], UserInfo['region'])
            // createJSON('matchlist.json', matchlist)
            let rawmatchlist = matchlist
            end = Date.now()
            if (matchlist) {
                console.log(indent + `Retrieved match list data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            }
            start = Date.now()
            const playerMatches = await DatabaseFunctions.get_Player_Matches(pid)
            let returned_matches = matchlist.length
            let toRemove = []
            if (playerMatches.length > 0) {
                for (matchid in matchlist) {
                    for (playerMatch in playerMatches) {
                        if (matchlist[matchid] == playerMatches[playerMatch].matchid) {
                            toRemove.push(matchlist[matchid])
                        }
                        else {
                            continue
                        }
                    }
                }
                for (item in toRemove) {
                    const index = matchlist.indexOf(toRemove[item]);
                    if (index > -1) {
                        matchlist.splice(index, 1);
                        returned_matches--
                    }
                }
                end = Date.now()
            }
            console.log(indent + `${returned_matches} undocumented matches found (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

            queue = 1
            if (matchlist.length > 0) {
                let newmatches = []
                for (m in matchlist) {
                    start = Date.now()
                    newmatches.push(await apiFunctions.getMatch(matchlist[m]))
                    end = Date.now()
                    console.log(indent + `retrieved match ${queue}/${returned_matches} data (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
                    queue++
                }
                start = Date.now()
                await DatabaseFunctions.mass_add(newmatches, rawmatchlist, pid)
                end = Date.now()
                console.log(indent + `All ${returned_matches} matches successfully added (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
            }
            start = Date.now()
            real_matches = (await DatabaseFunctions.get_matches_by_pid(pid)).sort((a, b) => b.match_starttime - a.match_starttime)

            let totalkills = 0
            let totaldeaths = 0
            let totalheadshots = 0
            let totalbodyshots = 0
            let totallegshots = 0
            let totalwins = 0
            let totallosses = 0
            let totaldraws = 0
            let past5kills = 0
            let past5deaths = 0
            let past5headshots = 0
            let past5bodyshots = 0
            let past5legshots = 0
            let past5wins = 0
            let past5losses = 0
            let past5draws = 0
            for (m in real_matches) {
                UserInfo['matches'].push(await processFunctions.alterMatch(JSON.parse(real_matches[m]['match_info']), UserInfo['puuid'], false))
            }
            // createJSON('match.json', UserInfo['matches'][0])
            for (m in UserInfo['matches']) {
                if (UserInfo['matches'][m]['data']['metadata']['mode_id'] == 'competitive') {
                    UserInfo.comp_matches.push(UserInfo['matches'][m])
                }
            }
            for (m in UserInfo['comp_matches']) {
                let userteam = ''
                if (UserInfo.agents.length == 0) {
                    if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Win") {
                        let input = {
                            agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 1,
                            losses: 0,
                            draws: 0,
                            kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                        input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].wins++
                        UserInfo.agents.push(input)
                    }
                    else if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Loss") {
                        let input = {
                            agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 1,
                            draws: 0,
                            kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                        input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].losses++
                        UserInfo.agents.push(input)
                    }
                    else {
                        let input = {
                            agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 0,
                            draws: 1,
                            kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                        input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                        UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].draws++
                        UserInfo.agents.push(input)
                    }
                }
                else {
                    let found = false
                    for (a in UserInfo.agents) {
                        if (UserInfo.agents[a].agent == UserInfo['comp_matches'][m]['data']['metadata']['agent']) {
                            UserInfo.agents[a].count++
                            UserInfo.agents[a].kills = UserInfo.agents[a].kills + UserInfo['comp_matches'][m]['data']['metadata']['kills']
                            UserInfo.agents[a].deaths = UserInfo.agents[a].deaths + UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                            UserInfo.agents[a].assists = UserInfo.agents[a].assists + UserInfo['comp_matches'][m]['data']['metadata']['assists']
                            if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Win") {
                                UserInfo.agents[a].wins++
                                UserInfo.agents[a].maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].wins++
                            }
                            else if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Loss") {
                                UserInfo.agents[a].losses++
                                UserInfo.agents[a].maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].losses++
                            }
                            else {
                                UserInfo.agents[a].draws++
                                UserInfo.agents[a].maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                                UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].draws++
                            }
                            found = true
                        }
                    }
                    if (!found) {
                        if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Win") {
                            let input = {
                                agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 1,
                                losses: 0,
                                draws: 0,
                                kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                            input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].wins++
                            UserInfo.agents.push(input)
                        }
                        else if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == "Loss") {
                            let input = {
                                agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 0,
                                losses: 1,
                                draws: 0,
                                kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                            input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].losses++
                            UserInfo.agents.push(input)
                        }
                        else {
                            let input = {
                                agent: UserInfo['comp_matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 0,
                                losses: 0,
                                draws: 1,
                                kills: UserInfo['comp_matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['comp_matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['comp_matches'][m]['data']['metadata']['assists'],
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
                            input.maps[UserInfo['comp_matches'][m]['data']['metadata']['map']]++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].count++
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].kills += UserInfo['comp_matches'][m]['data']['metadata']['kills']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].deaths += UserInfo['comp_matches'][m]['data']['metadata']['deaths']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].assists += UserInfo['comp_matches'][m]['data']['metadata']['assists']
                            UserInfo.maps_played[UserInfo['comp_matches'][m]['data']['metadata']['map']].draws++
                            UserInfo.agents.push(input)
                        }
                    }
                }
                for (p in UserInfo['comp_matches'][m]['data']['players']['all_players']) {
                    if (UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['puuid'] == UserInfo['puuid']) {
                        if (UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['team'] == 'Red') {
                            userteam = 'red'
                        }
                        else {
                            userteam = 'blue'
                        }
                        totalkills = totalkills + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                        totaldeaths = totaldeaths + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                        totalheadshots = totalheadshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                        totalbodyshots = totalbodyshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                        totallegshots = totallegshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                        if (m < 5) {
                            past5kills = past5kills + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                            past5deaths = past5deaths + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                            past5headshots = past5headshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                            past5bodyshots = past5bodyshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                            past5legshots = past5legshots + UserInfo['comp_matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                        }
                    }
                }
                if (UserInfo['comp_matches'][m]['data']['metadata']['result'] == 'Win') {
                    if (m < 5) {
                        past5wins = past5wins + 1
                    }
                    totalwins = totalwins + 1
                }
                else {
                    if (m < 5) {
                        past5losses = past5losses + 1
                    }
                    totallosses = totallosses + 1
                }
                for (tm in UserInfo['comp_matches'][m]['data']['players'][userteam]) {
                    if (UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['puuid'] != UserInfo['puuid']) {
                        if (UserInfo.teammates.length == 0) {
                            UserInfo.teammates.push({
                                puuid: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['puuid'],
                                count: 1,
                                wins: winCheckNum(UserInfo['comp_matches'][m], UserInfo['puuid']),
                                username: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['name'],
                                tag: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['tag'],
                            })
                        }
                        else {
                            let found = false
                            for (pl in UserInfo.teammates) {
                                if (UserInfo.teammates[pl].puuid == UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['puuid']) {
                                    UserInfo.teammates[pl].count++
                                    UserInfo.teammates[pl].wins += winCheckNum(UserInfo['comp_matches'][m], UserInfo['puuid'])
                                    found = true
                                    break
                                }
                            }
                            if (!found) {
                                UserInfo.teammates.push({
                                    puuid: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['puuid'],
                                    count: 1,
                                    wins: winCheckNum(UserInfo['comp_matches'][m], UserInfo['puuid']),
                                    username: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['name'],
                                    tag: UserInfo['comp_matches'][m]['data']['players'][userteam][tm]['tag'],
                                })
                            }
                        }
                    }
                }

            }

            let reformatTeammates = []
            for (pl in UserInfo.teammates) {
                // console.log(UserInfo.teammates[pl].count)
                if (UserInfo.teammates[pl].count > 1) {
                    // pData = await apiFunctions.getBasic_by_puuid(UserInfo.teammates[pl].puuid)
                    // UserInfo.teammates[pl].username = pData.username
                    // UserInfo.teammates[pl].tag = pData.tag
                    reformatTeammates.push(UserInfo.teammates[pl])
                }
            }
            UserInfo.teammates = reformatTeammates.sort(compare_count)
            UserInfo.agents.sort(compare_count)
            let reformatMaps = []
            for (m in UserInfo.maps_played) {
                reformatMaps.push({
                    name: m,
                    count: UserInfo.maps_played[m].count,
                    wins: UserInfo.maps_played[m].wins,
                    losses: UserInfo.maps_played[m].losses,
                    draws: UserInfo.maps_played[m].draws,
                    kills: UserInfo.maps_played[m].kills,
                    deaths: UserInfo.maps_played[m].deaths,
                    assists: UserInfo.maps_played[m].assists
                })
            }
            UserInfo.maps_played = reformatMaps
            UserInfo.maps_played.sort(compare_count)

            // createJSON('teammates.json', UserInfo.teammates)
            UserInfo['stats']['overall']['hs'] = totalheadshots
            UserInfo['stats']['overall']['bs'] = totalbodyshots
            UserInfo['stats']['overall']['ls'] = totallegshots
            UserInfo['stats']['past5']['hs'] = past5headshots
            UserInfo['stats']['past5']['bs'] = past5bodyshots
            UserInfo['stats']['past5']['ls'] = past5legshots
            UserInfo['stats']['overall']['HSP'] = Math.round((totalheadshots / (totalbodyshots + totalheadshots + totallegshots)) * 1000) / 10
            UserInfo['stats']['past5']['HSP'] = Math.round((past5headshots / (past5bodyshots + past5headshots + past5legshots)) * 1000) / 10
            UserInfo['stats']['overall']['kills'] = totalkills
            UserInfo['stats']['past5']['kills'] = past5kills
            UserInfo['stats']['overall']['deaths'] = totaldeaths
            UserInfo['stats']['past5']['deaths'] = past5deaths
            UserInfo['stats']['overall']['KD'] = Math.round((totalkills / totaldeaths) * 100) / 100
            UserInfo['stats']['past5']['KD'] = Math.round((past5kills / past5deaths) * 100) / 100
            UserInfo['stats']['overall']['wins'] = totalwins
            UserInfo['stats']['past5']['wins'] = past5wins
            UserInfo['stats']['overall']['losses'] = totallosses
            UserInfo['stats']['past5']['losses'] = past5losses
            UserInfo['stats']['overall']['wp'] = Math.round((totalwins / (totalwins + totallosses)) * 1000) / 10
            UserInfo['stats']['past5']['wp'] = Math.round((past5wins / (past5wins + past5losses)) * 1000) / 10
            // console.log(past5wins,past5losses)
            end = Date.now()
            console.log(indent + `All matches retrieved and formatted (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

            UserInfo.role_stats = await this.get_role_stats(UserInfo.comp_matches, UserInfo.puuid)
            console.log(`${topIndent}Data for ${UserInfo['username']}#${UserInfo['tag']} retrieved (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
            // const jsonUser = UserInfo
            // jsonUser.comp_matches = []
            // jsonUser.matches = []
            // createJSON(`userData/${UserInfo['username']}.json`, jsonUser)
            return UserInfo
        }
    },
    get_batch_user: async function (userList) {
        if (userList) {
            console.log(`Attempting to retrieve data for ${userList.length} accounts`)
            let og = Date.now()
            const colors = [
                "aliceblue",
                "antiquewhite",
                "aqua",
                "aquamarine",
                "azure",
                "beige",
                "bisque",
                "blanchedalmond",
                "blueviolet",
                "burlywood",
                "cadetblue",
                "chartreuse",
                "chocolate",
                "coral",
                "cornflowerblue",
                "cornsilk",
                "crimson",
                "cyan",
                "deeppink",
                "deepskyblue",
                "dimgray",
                "dodgerblue",
                "firebrick",
                "floralwhite",
                "forestgreen",
                "fuchsia",
                "gainsboro",
                "ghostwhite",
                "gold",
                "goldenrod",
                "gray",
                "green",
                "greenyellow",
                "honeydew",
                "hotpink",
                "indianred",
                "indigo",
                "ivory",
                "khaki",
                "lavender",
                "lavenderblush",
                "lawngreen",
                "lemonchiffon",
                "lightblue",
                "lightcoral",
                "lightcyan",
                "lightgoldenrodyellow",
                "lightgray",
                "lightgreen",
                "lightpink",
                "lightsalmon",
                "lightseagreen",
                "lightskyblue",
                "lightslategray",
                "lightsteelblue",
                "lightyellow",
                "lime",
                "limegreen",
                "linen",
                "magenta",
                "maroon",
                "mediumaquamarine",
                "mediumblue",
                "mediumorchid",
                "mediumpurple",
                "mediumseagreen",
                "mediumslateblue",
                "mediumspringgreen",
                "mediumturquoise",
                "midnightblue",
                "mistyrose",
                "moccasin",
                "navajowhite",
                "navy",
                "oldlace",
                "olive",
                "olivedrab",
                "orange",
                "orangered",
                "orchid",
                "palegoldenrod",
                "palegreen",
                "paleturquoise",
                "palevioletred",
                "papayawhip",
                "peachpuff",
                "peru",
                "pink",
                "plum",
                "powderblue",
                "purple",
                "red",
                "rosybrown",
                "royalblue",
                "salmon",
                "seagreen",
                "seashell",
                "sienna",
                "silver",
                "skyblue",
                "slateblue",
                "slategray",
                "snow",
                "springgreen",
                "steelblue",
                "tan",
                "teal",
                "thistle",
                "tomato",
                "turquoise",
                "violet",
                "wheat",
                "white",
                "whitesmoke",
                "yellow",
                "yellowgreen"
            ];

            let batch = {
                userList,
                accounts: []
            }
            for (let userRaw of userList) {
                let user = userRaw.split('#');
                let userColor = pickRandomColor(colors);
                let userData = await this.get_user_data(user[0], user[1], true);
                if (userData) {
                    userData.userColor = userColor
                }
                else {
                    return undefined
                }
                batch.accounts.push(userData)
            }
            let end = Date.now()
            console.log(`Batch retrieved (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
            batch = combineUserStats(batch)
            // batch.accounts.forEach(acc => {
            //     acc.matches = undefined
            //     acc.comp_matches = undefined
            // });
            batch.comp_matches.sort((a, b) => b['data']['metadata']['game_start'] - a['data']['metadata']['game_start'])
            batch.matches.sort((a, b) => b['data']['metadata']['game_start'] - a['data']['metadata']['game_start'])
            return batch
        }
        else {
            return undefined
        }
    },
    get_role_stats: async function (matches, puuid) {
        let role_stats = {
            controller: {
                name: 'controller',
                count: 0,
                score: 0,
                rounds: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            initiator: {
                name: 'initiator',
                count: 0,
                score: 0,
                rounds: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            duelist: {
                name: 'duelist',
                count: 0,
                score: 0,
                rounds: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
            sentinel: {
                name: 'sentinel',
                count: 0,
                score: 0,
                rounds: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0
            },
        }
        for (m in matches) {
            let stats = player_match_stats(matches[m], puuid)
            if (stats.win) {
                role_stats[stats.role].count++
                role_stats[stats.role].score += stats.score
                role_stats[stats.role].rounds += stats.rounds
                role_stats[stats.role].wins++
                role_stats[stats.role].kills += stats.kills
                role_stats[stats.role].deaths += stats.deaths
                role_stats[stats.role].assists += stats.assists
            }
            else {
                role_stats[stats.role].count++
                role_stats[stats.role].score += stats.score
                role_stats[stats.role].rounds += stats.rounds
                role_stats[stats.role].losses++
                role_stats[stats.role].kills += stats.kills
                role_stats[stats.role].deaths += stats.deaths
                role_stats[stats.role].assists += stats.assists
            }
        }

        role_stats.controller.acs = Math.round(role_stats.controller.score / role_stats.controller.rounds)
        role_stats.initiator.acs = Math.round(role_stats.initiator.score / role_stats.initiator.rounds)
        role_stats.duelist.acs = Math.round(role_stats.duelist.score / role_stats.duelist.rounds)
        role_stats.sentinel.acs = Math.round(role_stats.sentinel.score / role_stats.sentinel.rounds)

        role_stats.controller.play_rate = String(Math.round((role_stats.controller.count / matches.length) * 10000) / 100) + "%"
        role_stats.initiator.play_rate = String(Math.round((role_stats.initiator.count / matches.length) * 10000) / 100) + "%"
        role_stats.duelist.play_rate = String(Math.round((role_stats.duelist.count / matches.length) * 10000) / 100) + "%"
        role_stats.sentinel.play_rate = String(Math.round((role_stats.sentinel.count / matches.length) * 10000) / 100) + "%"

        role_stats = [
            role_stats.controller,
            role_stats.initiator,
            role_stats.duelist,
            role_stats.sentinel,
        ]
        // await createJSON('role_stats.json',role_stats)
        return role_stats
    },
    get_map_stats: async function (matches, actId) {
        let maps = []
        if (actId) {
            for (m in matches) {
                if (matches[m]['data']['metadata']['season_id'] == actId) {
                    if (maps.length == 0) {
                        let newmap = {
                            name: matches[m]['data']['metadata']['map'],
                            attk_wins: 0,
                            def_wins: 0,
                            comps: [],
                            count: 1,
                        }
                        let rounds = getAttkDefWins(matches[m])
                        newmap.attk_wins = rounds[0]
                        newmap.def_wins = rounds[1]
                        let comp = await formatComp(newmap.comps, matches[m]['data']['players']['red'])
                        if (isNumber(comp)) {
                            newmap.comps[comp].count++
                        }
                        else {
                            newmap.comps.push(comp)
                        }
                        comp = await formatComp(newmap.comps, matches[m]['data']['players']['blue'])
                        if (isNumber(comp)) {
                            newmap.comps[comp].count++
                        }
                        else {
                            newmap.comps.push(comp)
                        }
                        maps.push(newmap)
                    }
                    else {
                        let notFound = true
                        for (ma in maps) {
                            if (maps[ma].name == matches[m]['data']['metadata']['map']) {
                                notFound = false
                                let rounds = getAttkDefWins(matches[m])
                                maps[ma].attk_wins += rounds[0]
                                maps[ma].def_wins += rounds[1]
                                maps[ma].count++

                                let comp = await formatComp(maps[ma].comps, matches[m]['data']['players']['red'])
                                if (isNumber(comp)) {
                                    maps[ma].comps[comp].count++
                                }
                                else {
                                    maps[ma].comps.push(comp)
                                }
                                comp = await formatComp(maps[ma].comps, matches[m]['data']['players']['blue'])
                                if (isNumber(comp)) {
                                    maps[ma].comps[comp].count++
                                }
                                else {
                                    maps[ma].comps.push(comp)
                                }

                            }
                        }
                        if (notFound){
                            let newmap = {
                                name: matches[m]['data']['metadata']['map'],
                                attk_wins: 0,
                                def_wins: 0,
                                comps: [],
                                count: 1,
                            }
                            let rounds = getAttkDefWins(matches[m])
                            newmap.attk_wins = rounds[0]
                            newmap.def_wins = rounds[1]
                            let comp = await formatComp(newmap.comps, matches[m]['data']['players']['red'])
                            if (isNumber(comp)) {
                                newmap.comps[comp].count++
                            }
                            else {
                                newmap.comps.push(comp)
                            }
                            comp = await formatComp(newmap.comps, matches[m]['data']['players']['blue'])
                            if (isNumber(comp)) {
                                newmap.comps[comp].count++
                            }
                            else {
                                newmap.comps.push(comp)
                            }
                            maps.push(newmap)
                        }
                    }
                }
            }
        }
        else {
            for (m in matches) {
                    if (maps.length == 0) {
                        let newmap = {
                            name: matches[m]['data']['metadata']['map'],
                            attk_wins: 0,
                            def_wins: 0,
                            comps: [],
                            count: 1,
                        }
                        let rounds = getAttkDefWins(matches[m])
                        newmap.attk_wins = rounds[0]
                        newmap.def_wins = rounds[1]
                        let comp = await formatComp(newmap.comps, matches[m]['data']['players']['red'])
                        if (isNumber(comp)) {
                            newmap.comps[comp].count++
                        }
                        else {
                            newmap.comps.push(comp)
                        }
                        comp = await formatComp(newmap.comps, matches[m]['data']['players']['blue'])
                        if (isNumber(comp)) {
                            newmap.comps[comp].count++
                        }
                        else {
                            newmap.comps.push(comp)
                        }
                        maps.push(newmap)
                    }
                    else {
                        let notFound = true
                        for (ma in maps) {
                            if (maps[ma].name == matches[m]['data']['metadata']['map']) {
                                notFound = false
                                let rounds = getAttkDefWins(matches[m])
                                maps[ma].attk_wins += rounds[0]
                                maps[ma].def_wins += rounds[1]
                                maps[ma].count++

                                let comp = await formatComp(maps[ma].comps, matches[m]['data']['players']['red'])
                                if (isNumber(comp)) {
                                    maps[ma].comps[comp].count++
                                }
                                else {
                                    maps[ma].comps.push(comp)
                                }
                                comp = await formatComp(maps[ma].comps, matches[m]['data']['players']['blue'])
                                if (isNumber(comp)) {
                                    maps[ma].comps[comp].count++
                                }
                                else {
                                    maps[ma].comps.push(comp)
                                }

                            }
                        }
                        if (notFound){
                            let newmap = {
                                name: matches[m]['data']['metadata']['map'],
                                attk_wins: 0,
                                def_wins: 0,
                                comps: [],
                                count: 1,
                            }
                            let rounds = getAttkDefWins(matches[m])
                            newmap.attk_wins = rounds[0]
                            newmap.def_wins = rounds[1]
                            let comp = await formatComp(newmap.comps, matches[m]['data']['players']['red'])
                            if (isNumber(comp)) {
                                newmap.comps[comp].count++
                            }
                            else {
                                newmap.comps.push(comp)
                            }
                            comp = await formatComp(newmap.comps, matches[m]['data']['players']['blue'])
                            if (isNumber(comp)) {
                                newmap.comps[comp].count++
                            }
                            else {
                                newmap.comps.push(comp)
                            }
                            maps.push(newmap)
                        }
                    }
                }
            
        }
        for (m in maps){
            maps[m].comps.sort(compare_count)
        }
        return maps
    },
    adjustLastEpisodeActs: async function(episodes) {
        const lastEpisode = episodes[episodes.length - 1];
    
        if (lastEpisode.acts.length > 0) {
            // Check if Act 1 is active
            if (lastEpisode.acts[0].isActive) {
                // Remove Acts 2 and 3
                lastEpisode.acts = lastEpisode.acts.slice(0, 1);
            }
            // Check if Act 2 is active and Act 1 is not
            else if (lastEpisode.acts[1].isActive) {
                // Remove Act 3
                lastEpisode.acts = lastEpisode.acts.slice(0, 2);
            }
            // If Act 3 is active, we do nothing as all acts should be present
        }
    
        return episodes;
    },
    reformatEpisodes: async function(data) {
        const result = [];
        let currentEpisode = null;
    
        // Iterate through the data
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i].name.startsWith("EPISODE")) {
                currentEpisode = {
                    id: data[i].id,
                    name: data[i].name,
                    acts: []
                };
                result.unshift(currentEpisode);
            } else if (data[i].name.startsWith("ACT")) {
                if (currentEpisode) {
                    currentEpisode.acts.unshift({
                        id: data[i].id,
                        name: data[i].name,
                        isActive: data[i].isActive // Preserve the original isActive property
                    });
                }
            } else {
                // Handling the "Closed Beta"
                if (data[i].name === "Closed Beta") {
                    result.unshift({
                        id: data[i].id,
                        name: data[i].name,
                        acts: []
                    });
                }
            }
        }
    
        return this.adjustLastEpisodeActs(result);
    },
    getHalfStats: async function(matches) {
        let raw_result = []
        for (m in matches) {
            let match_stats = {
                id:matches[m]['data']['metadata']['matchid']
            }
            if (matches[m]['data']['teams']['red']['has_won']){
                match_stats.matchWinner = 'Red'
            }
            else if (matches[m]['data']['teams']['blue']['has_won']){
                match_stats.matchWinner = 'Blue'
            }
            else {
                match_stats.matchWinner = '?'
            }
            let blueWins = 0
            let redWins = 0
            for (round in matches[m]['data']['rounds']) {
                if (round == 12) {
                    break
                }
                else if (matches[m]['data']['rounds'][round]['winning_team'] == 'Blue') {
                    blueWins++
                }
                else {
                    redWins++
                }
            }
            if (blueWins == redWins){
                continue
            }
            else if (blueWins > redWins){
                match_stats.halfWinner = 'Blue'
                match_stats.score = String(blueWins)+"-"+String(redWins)
            }
            else {
                match_stats.halfWinner = 'Red'
                match_stats.score = String(redWins)+"-"+String(blueWins)
            }
            raw_result.push(match_stats)
        }
        let result = [
            {
                score : '7-5',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
            {
                score : '8-4',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
            {
                score : '9-3',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
            {
                score : '10-2',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
            {
                score : '11-1',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
            {
                score : '12-0',
                count:0,
                comebacks:0,
                comeback_matches:[]
            },
        ]
        for (m in raw_result){
            for (i in result){
                if (result[i].score == raw_result[m]['score']){
                    result[i].count++
                    if (raw_result[m]['matchWinner'] != raw_result[m]['halfWinner']){
                        result[i].comebacks++
                        result[i].comeback_matches.push(raw_result[m].id)
                    }
                }
            }
        }
        for (i in result){
            result[i].comeback_percentage = Math.round((result[i].comebacks/result[i].count)*10000)/100
        }
        return result
    }
};

module.exports = processFunctions;
