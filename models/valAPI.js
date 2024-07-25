const fetch = require("node-fetch")
const key = "?api_key=HDEV-cbf520fc-b91f-4235-b15b-a4d663f6bc9b"
const size = '&size=20'


const UserData = {
    getBasic: async function (user, tag) {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${user}/${tag}` + key, {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        // console.log(data['data'])
        return {
            puuid: data['data']['puuid'],
            small_card: data['data']['card']['small'],
            acc_lvl: data['data']['account_level'],
            reg: data['data']['region']
        }
    },
    getMatchList: async function (puuid, reg) {
        let result = []
        // console.log(reg)
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/by-puuid/stored-matches/${reg}/${puuid}` + key + size, {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        for (match in data['data']) {
            result.push(data['data'][match]['meta']['id'])
        }
        return result

    },
    getMatch: async function (matchid) {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v2/match/${matchid}` + key, {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        return data

    },
    alterMatch: async function (match, puuid) {
        if (match['data']['metadata']['mode_id'] == 'deathmatch') {
            match['data']['metadata']['agent'] = match['data']['players']['all_players'][player]['character']

        }
        else {
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
                    match['data']['metadata']['kd'] = Math.round((kills / deaths)*100)/100
                    match['data']['metadata']['HSP'] = Math.round((headshots/(headshots+legshots+bodyshots))*1000)/10
                    break
                }
            }
            let redscore = match['data']['teams']['red']['rounds_won']
            let bluescore = match['data']['teams']['blue']['rounds_won']
            if (redscore > bluescore) {
                if (playerteam == 'Red') {
                    match['data']['metadata']['result'] = 'win'
                    match['data']['metadata']['score'] = redscore + '-' + bluescore
                }
                else {
                    match['data']['metadata']['result'] = 'loss'
                    match['data']['metadata']['score'] = redscore + '-' + bluescore
                }
            }
            else if (bluescore > redscore) {
                if (playerteam == 'Blue') {
                    match['data']['metadata']['result'] = 'win'
                    match['data']['metadata']['score'] = bluescore + '-' + redscore
                }
                else {
                    match['data']['metadata']['result'] = 'loss'
                    match['data']['metadata']['score'] = bluescore + '-' + redscore
                }
            }
            else {
                match['data']['metadata']['result'] = 'draw'
                match['data']['metadata']['score'] = bluescore + '-' + redscore
            }
        }

        return match
    },
};

module.exports = UserData;
