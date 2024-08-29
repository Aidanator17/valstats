const { PrismaClient } = require('@prisma/client');
const { tr, el } = require('date-fns/locale');
const { json } = require('express');
const prisma = new PrismaClient();
const fs = require('fs');

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
        if (actId) {
            for (m in matches) {
                if (matches[m]['data']['metadata']['season_id'] == actId) {
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
        return output
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
    }

};

module.exports = processFunctions;
