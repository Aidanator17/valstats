const { PrismaClient } = require('@prisma/client');
const { tr } = require('date-fns/locale');
const { json } = require('express');
const prisma = new PrismaClient();
const fs = require('fs');


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
            data:
                { puuid }
        })
        return createPlayer
    },
    get_Player_Matches: async function (pid, puuid) {
        if (puuid) {
            const p = await prisma.players.findMany({
                where:{
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
            where: { match_id: id },
            data: { adjusted: 1 }
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
        }
        else {
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
        }
        catch (error) {
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
            }
            catch (error) {
                console.error('Error creating player-matches:', error);
            }
        }


    },
    mass_retrieve: async function () {
        const totalMatches = await prisma.matches.count({
            where: { adjusted: 0 }
        }
        );
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
                where: { match_type: 'competitive', act_id: id }
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
                raw_matches = raw_matches.concat(iter_matches)
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
        }
        else {
            let start = Date.now()
            const totalMatches = await prisma.matches.count({
                where: { match_type: 'competitive' }
            })
            let iter = Math.ceil(totalMatches / 300)
            let s = 0
            let raw_matches = []
            for (let step = 0; step < iter; step++) {
                const iter_matches = await prisma.matches.findMany({
                    skip: s,
                    take: 300,
                    where: {
                        match_type: 'competitive'
                    },
                    select: {
                        match_info: true
                    }
                })
                raw_matches = raw_matches.concat(iter_matches)
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
        }
    },
    fix_act_ids: async function () {
        if (true) { }
        else {
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
    }

};

module.exports = DatabaseFunctions;
