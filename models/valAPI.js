const fetch = require("node-fetch")
const key = "?api_key=HDEV-cbf520fc-b91f-4235-b15b-a4d663f6bc9b"
const size = '&size=20'

function compare_score(a, b) {
    if (a['stats']['score'] < b['stats']['score']) {
        return 1;
    }
    if (a['stats']['score'] > b['stats']['score']) {
        return -1;
    }
    return 0;
}

const UserData = {
    getBasic: async function (user, tag) {
        try {
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
        }
        catch {
            return {
                puuid: '404_error',
                small_card: '404_error',
                acc_lvl: '404_error',
                reg: '404_error'
            }
        }
    },
    getBasic_by_puuid: async function (pid) {
        try {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v2/by-puuid/account/${pid}` + key, {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        // console.log(data)
        return {
            username: data['data']['name'],
            tag: data['data']['tag'],
            small_card: data['data']['card']['small'],
            acc_lvl: data['data']['account_level'],
            reg: data['data']['region']
        }}
        catch{
            // console.log("ERROR PUUID:",pid)
            return {
                username: 'error',
                tag: 'error',
                small_card: 'error',
                acc_lvl: 'error',
                reg: 'error'
            }
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
};

module.exports = UserData;
