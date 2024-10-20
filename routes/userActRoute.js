const express = require("express");
const router = express.Router();
const apiFunctions = require('../models/valAPI.js');
const fs = require('fs');
const fetch = require("node-fetch")
const DatabaseFunctions = require("../models/databaseModel");
const processFunctions = require("../models/processModel");
const UserFunctions = require("../models/userModel.js")
const { tr } = require("date-fns/locale");
const indent = `    `

async function createJSON(name, jsondata) {
    fs.writeFile('./extra-files/' + name, JSON.stringify(jsondata), function (err) {
        if (err) {
            console.log(err);
        }
    });
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


router.get('/', async (req, res) => {
    // const id = (await UserData.getBasic('Fish','4484')).puuid
    // console.log(await db.check_player(id))

    // for (let i = 0; i < 10; i++){
    //     res.render('test',{testValue:getRandomInt(500)})
    // }
    await apiFunctions.activeSeason()
    res.redirect('/user-by-act/lookup')
})

router.get('/lookup', async (req, res) => {
    const unfEps = await apiFunctions.getData()
    const Eps = await processFunctions.reformatEpisodes(unfEps['acts'])
    // console.log(Eps)
    if (req.query.failed == 'true') {
        res.render('useractlookup', {
            failed: true,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
    else {
        res.render('useractlookup', {
            failed: false,
            title: 'User Lookup',
            sheet: 'lookup-style.css',
            episodes: Eps.reverse()
        })
    }
})

router.post('/lookup', async (req, res) => {
    res.redirect('/user-by-act/' + req.body.user + '/' + req.body.tag + '/' + req.body.act)
})

// router.get('/:puuid', async (req, res) => {
//     let data = await apiFunctions.getBasic_by_puuid(req.params.puuid)
//     res.redirect(`/user-by-act/${data['username']}/${data['tag']}`)
// })

router.get('/:user/:tag/:act', async (req, res) => {
    console.log(`Attempting to retrieve act data for ${req.params.user}#${req.params.tag}`)

    let start = Date.now()
    let og = Date.now()

    let UserInfo = {
        username: req.params.user,
        tag: req.params.tag,
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
    const info = await apiFunctions.getBasic(req.params.user, req.params.tag)
    if (info.puuid == '404_error') {
        console.log('User not found. Redirecting.')
        res.redirect('/user-by-act/lookup?failed=true')
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
        real_matches = (await DatabaseFunctions.get_matches_by_pid(pid, req.params.act)).sort((a, b) => b.match_starttime - a.match_starttime)

        let totalkills = 0
        let totaldeaths = 0
        let totalheadshots = 0
        let totalbodyshots = 0
        let totallegshots = 0
        let totalwins = 0
        let totallosses = 0
        let past5kills = 0
        let past5deaths = 0
        let past5headshots = 0
        let past5bodyshots = 0
        let past5legshots = 0
        let past5wins = 0
        let past5losses = 0
        for (m in real_matches) {
            if (real_matches[m]['act_id'] == req.params.act) {
                UserInfo['matches'].push(await processFunctions.alterMatch(JSON.parse(real_matches[m]['match_info']), UserInfo['puuid'], false))
            }
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
        UserInfo['stats']['overall']['HSP'] = Math.round((totalheadshots / (totalbodyshots + totalheadshots + totallegshots)) * 1000) / 10
        UserInfo['stats']['past5']['HSP'] = Math.round((past5headshots / (past5bodyshots + past5headshots + past5legshots)) * 1000) / 10
        UserInfo['stats']['overall']['KD'] = Math.round((totalkills / totaldeaths) * 100) / 100
        UserInfo['stats']['past5']['KD'] = Math.round((past5kills / past5deaths) * 100) / 100
        UserInfo['stats']['overall']['wp'] = Math.round((totalwins / (totalwins + totallosses)) * 1000) / 10
        UserInfo['stats']['past5']['wp'] = Math.round((past5wins / (past5wins + past5losses)) * 1000) / 10
        // console.log(past5wins,past5losses)












        end = Date.now()
        console.log(indent + `All matches retrieved and formatted (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        // let jsonUser = JSON.parse(JSON.stringify(UserInfo))
        // jsonUser.matches = undefined
        // createJSON("user.json", jsonUser)

        end = Date.now()
        console.log(`Data for ${UserInfo['username']}#${UserInfo['tag']} retrieved (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        UserInfo.role_stats = await processFunctions.get_role_stats(UserInfo.comp_matches, UserInfo.puuid)
        UserInfo.roundKills = await processFunctions.getRoundKills(UserInfo.comp_matches, UserInfo.puuid)
        // console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
        UserInfo.utilUsage = await UserFunctions.getUtilUsage(UserInfo['comp_matches'], UserInfo['puuid'])
        // await createJSON(`/utilUsage/${UserInfo.username}.json`, UserInfo.utilUsage)
        res.render('user', {
            UserInfo,
            title: UserInfo['username'],
            sheet: 'user.css'
        })
    }

})

router.get('/:user/:tag/:matchid', async (req, res) => {
    let start = Date.now()
    const match = JSON.parse((await DatabaseFunctions.get_match_by_match_id(req.params.matchid))['match_info'])
    const puuid = (await apiFunctions.getBasic(req.params.user, req.params.tag)).puuid
    match['data']['metadata']['main-username'] = req.params.user
    match['data']['metadata']['main-tag'] = req.params.tag

    const matchData = await processFunctions.alterMatch(match, puuid, true)
    let end = Date.now()
    console.log(`Match data for ${req.params.matchid} retrieved (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.render('user-match', {
        matchData,
        title: 'Match Details',
        sheet: 'user-match.css'
    })
})

module.exports = router