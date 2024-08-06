const express = require("express");
const router = express.Router();
const fetch = require("node-fetch")
const UserData = require('../models/valAPI');
const fs = require('fs');
const DatabaseFunctions = require("../models/databaseModel");
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



router.get('/', async (req, res) => {
    // const id = (await UserData.getBasic('Fish','4484')).puuid
    // console.log(await db.check_player(id))

    // for (let i = 0; i < 10; i++){
    //     res.render('test',{testValue:getRandomInt(500)})
    // }

    res.redirect('/user/lookup')
})

router.get('/lookup', async (req, res) => {
    if (req.query.failed == 'true') {
        res.render('userlookup', { failed: true })
    }
    else {
        res.render('userlookup', { failed: false })
    }
})

router.post('/lookup', async (req, res) => {
    res.redirect('/user/' + req.body.user + '/' + req.body.tag)
})

router.get('/:puuid', async (req, res) => {
    let data = await UserData.getBasic_by_puuid(req.params.puuid)
    res.redirect(`/user/${data['username']}/${data['tag']}`)
})

router.get('/:user/:tag', async (req, res) => {
    console.log(`Attempting to retrieve data for ${req.params.user}#${req.params.tag}`)

    let start = Date.now()
    let og = Date.now()

    let UserInfo = {
        username: req.params.user,
        tag: req.params.tag,
        matches: [],
        stats: {
            overall: {},
            past5: {}
        },
        teammates: [],
        agents: []
    }
    const info = await UserData.getBasic(req.params.user, req.params.tag)
    if (info.puuid == '404_error') {
        console.log('User not found. Redirecting.')
        res.redirect('/user/lookup?failed=true')
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
        let matchlist = await UserData.getMatchList(UserInfo['puuid'], UserInfo['region'])
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
                newmatches.push(await UserData.getMatch(matchlist[m]))
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
        let past5kills = 0
        let past5deaths = 0
        let past5headshots = 0
        let past5bodyshots = 0
        let past5legshots = 0
        let past5wins = 0
        let past5losses = 0
        for (m in real_matches) {
            UserInfo['matches'].push(await UserData.alterMatch(JSON.parse(real_matches[m]['match_info']), UserInfo['puuid'], false))
        }
        // createJSON('match.json', UserInfo['matches'][0])
        for (m in UserInfo['matches']) {

            if (UserInfo['matches'][m]['data']['metadata']['mode_id'] == 'competitive') {
                let userteam = ''
                if (UserInfo.agents.length == 0) {
                    if (UserInfo['matches'][m]['data']['metadata']['result'] == "Win") {
                        UserInfo.agents.push({
                            agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 1,
                            losses: 0,
                            draws: 0,
                            kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['matches'][m]['data']['metadata']['assists']
                        })
                    }
                    else if (UserInfo['matches'][m]['data']['metadata']['result'] == "Loss") {
                        UserInfo.agents.push({
                            agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 1,
                            draws: 0,
                            kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['matches'][m]['data']['metadata']['assists']
                        })
                    }
                    else {
                        UserInfo.agents.push({
                            agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                            count: 1,
                            wins: 0,
                            losses: 0,
                            draws: 1,
                            kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                            deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                            assists: UserInfo['matches'][m]['data']['metadata']['assists']
                        })
                    }
                }
                else {
                    let found = false
                    for (a in UserInfo.agents) {
                        if (UserInfo.agents[a].agent == UserInfo['matches'][m]['data']['metadata']['agent']) {
                            UserInfo.agents[a].count++
                            UserInfo.agents[a].kills = UserInfo.agents[a].kills + UserInfo['matches'][m]['data']['metadata']['kills']
                            UserInfo.agents[a].deaths = UserInfo.agents[a].deaths + UserInfo['matches'][m]['data']['metadata']['deaths']
                            UserInfo.agents[a].assists = UserInfo.agents[a].assists + UserInfo['matches'][m]['data']['metadata']['assists']
                            if (UserInfo['matches'][m]['data']['metadata']['result'] == "Win") {
                                UserInfo.agents[a].wins++
                            }
                            else if (UserInfo['matches'][m]['data']['metadata']['result'] == "Loss") {
                                UserInfo.agents[a].losses++
                            }
                            else {
                                UserInfo.agents[a].draws++
                            }
                            found = true
                        }
                    }
                    if (!found) {
                        if (UserInfo['matches'][m]['data']['metadata']['result'] == "Win") {
                            UserInfo.agents.push({
                                agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 1,
                                losses: 0,
                                draws: 0,
                                kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['matches'][m]['data']['metadata']['assists']
                            })
                        }
                        else if (UserInfo['matches'][m]['data']['metadata']['result'] == "Loss") {
                            UserInfo.agents.push({
                                agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 0,
                                losses: 1,
                                draws: 0,
                                kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['matches'][m]['data']['metadata']['assists']
                            })
                        }
                        else {
                            UserInfo.agents.push({
                                agent: UserInfo['matches'][m]['data']['metadata']['agent'],
                                count: 1,
                                wins: 0,
                                losses: 0,
                                draws: 1,
                                kills: UserInfo['matches'][m]['data']['metadata']['kills'],
                                deaths: UserInfo['matches'][m]['data']['metadata']['deaths'],
                                assists: UserInfo['matches'][m]['data']['metadata']['assists']
                            })
                        }
                    }
                }
                for (p in UserInfo['matches'][m]['data']['players']['all_players']) {
                    if (UserInfo['matches'][m]['data']['players']['all_players'][p]['puuid'] == UserInfo['puuid']) {
                        if (UserInfo['matches'][m]['data']['players']['all_players'][p]['team'] == 'Red') {
                            userteam = 'red'
                        }
                        else {
                            userteam = 'blue'
                        }
                        totalkills = totalkills + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                        totaldeaths = totaldeaths + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                        totalheadshots = totalheadshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                        totalbodyshots = totalbodyshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                        totallegshots = totallegshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                        if (m < 5) {
                            past5kills = past5kills + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['kills']
                            past5deaths = past5deaths + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['deaths']
                            past5headshots = past5headshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['headshots']
                            past5bodyshots = past5bodyshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['bodyshots']
                            past5legshots = past5legshots + UserInfo['matches'][m]['data']['players']['all_players'][p]['stats']['legshots']
                        }
                    }
                }
                if (UserInfo['matches'][m]['data']['metadata']['result'] == 'Win') {
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
                for (tm in UserInfo['matches'][m]['data']['players'][userteam]) {
                    if (UserInfo['matches'][m]['data']['players'][userteam][tm]['puuid'] != UserInfo['puuid']) {
                        if (UserInfo.teammates.length == 0) {
                            UserInfo.teammates.push({
                                puuid: UserInfo['matches'][m]['data']['players'][userteam][tm]['puuid'],
                                count: 1
                            })
                        }
                        else {
                            let found = false
                            for (pl in UserInfo.teammates) {
                                if (UserInfo.teammates[pl].puuid == UserInfo['matches'][m]['data']['players'][userteam][tm]['puuid']) {
                                    UserInfo.teammates[pl].count++
                                    found = true
                                    break
                                }
                            }
                            if (!found) {
                                UserInfo.teammates.push({
                                    puuid: UserInfo['matches'][m]['data']['players'][userteam][tm]['puuid'],
                                    count: 1
                                })
                            }
                        }
                    }
                }
            }
        }

        let reformatTeammates = []
        for (pl in UserInfo.teammates) {
            // console.log(UserInfo.teammates[pl].count)
            if (UserInfo.teammates[pl].count > 1) {
                pData = await UserData.getBasic_by_puuid(UserInfo.teammates[pl].puuid)
                UserInfo.teammates[pl].username = pData.username
                UserInfo.teammates[pl].tag = pData.tag
                reformatTeammates.push(UserInfo.teammates[pl])
            }
        }
        UserInfo.teammates = reformatTeammates.sort(compare_count)
        UserInfo.agents.sort(compare_count)
        // createJSON('teammates.json', UserInfo.teammates)
        UserInfo['stats']['overall']['HSP'] = Math.round((totalheadshots / (totalbodyshots + totalheadshots + totallegshots)) * 1000) / 10
        UserInfo['stats']['past5']['HSP'] = Math.round((past5headshots / (past5bodyshots + past5headshots + past5legshots)) * 1000) / 10
        UserInfo['stats']['overall']['KD'] = Math.round((totalkills / totaldeaths) * 100) / 100
        UserInfo['stats']['past5']['KD'] = Math.round((past5kills / past5deaths) * 100) / 100
        UserInfo['stats']['overall']['wp'] = Math.round((totalwins / (totalwins + totallosses)) * 1000) / 10
        UserInfo['stats']['past5']['wp'] = Math.round((past5wins / (past5wins + past5losses)) * 1000) / 10
        // console.log(UserInfo['stats'])












        end = Date.now()
        console.log(indent + `All matches retrieved and formatted (${Math.round(((end - start) / 1000) * 10) / 10}s)`)

        // let jsonUser = UserInfo
        // jsonUser.matches = undefined
        // createJSON("user.json", jsonUser)

        end = Date.now()
        console.log(`Data for ${UserInfo['username']}#${UserInfo['tag']} retrieved (${Math.round(((end - og) / 1000) * 10) / 10}s)`)
        // console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)
        res.render('user', { UserInfo })
    }

})

router.get('/:user/:tag/:matchid', async (req, res) => {
    let start = Date.now()
    const match = JSON.parse((await DatabaseFunctions.get_match_by_match_id(req.params.matchid))['match_info'])
    const puuid = (await UserData.getBasic(req.params.user, req.params.tag)).puuid
    match['data']['metadata']['main-username'] = req.params.user
    match['data']['metadata']['main-tag'] = req.params.tag

    const matchData = await UserData.alterMatch(match, puuid, true)
    let end = Date.now()
    console.log(`Match data for ${req.params.matchid} retrieved (${Math.round(((end - start) / 1000) * 10) / 10}s)`)
    res.render('user-match', { matchData })
})

module.exports = router