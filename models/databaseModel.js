const { PrismaClient } = require('@prisma/client');
const { json } = require('express');
const prisma = new PrismaClient();
const fs = require('fs');


async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/'+name, JSON.stringify(jsondata), function (err) {
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
            data:
                { puuid }
        })
        return createPlayer
    },
    get_Player_Matches: async function (pid) {
        const playerMatches = await prisma.players_matches.findMany({
            where: {
                player_id: pid
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
    get_matches_by_pid: async function (pid) {
        const playerMatches = await DatabaseFunctions.get_Player_Matches(pid)
        let ids = []
        for (pmatch in playerMatches) {
            ids.push(playerMatches[pmatch].matchid)
        }
        const matches = await prisma.matches.findMany({
            where: {
                match_id: {
                    in: ids
                }
            }
        })
        return matches
    },
    get_match_by_match_id: async function (mid) {
        const match = await prisma.matches.findUnique({
            where:{
                match_id:mid
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
                    match_starttime: matches[match]['data']['metadata']['game_start']
                })
            }
            const newMatches = await prisma.matches.createMany({
                data: matchinput,
                skipDuplicates: true
            })
        }
        catch (error) {
            console.error('Error creating matches:', error);
        }
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
        }
        catch (error) {
            console.error('Error creating player-matches:', error);
        }


    },
    mass_retrieve: async function () {
        const all_matches = await prisma.matches.findMany()
        return all_matches        
    },
    mass_retrieve_comp: async function () {
        const raw_matches = await prisma.matches.findMany({
            where: {
                match_type:'competitive'
            }
        })
        let matches = []
        for (m in raw_matches){
            matches.push(JSON.parse(raw_matches['match_info']))
        }
        return matches
    }

};

module.exports = DatabaseFunctions;
