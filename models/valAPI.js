const fetch = require("node-fetch")
const key = "?api_key=HDEV-cbf520fc-b91f-4235-b15b-a4d663f6bc9b"
const size = '&size=50'

const UserData = {
    getBasic: async function (user, tag) {
        try {
            const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/account/${user}/${tag}` + key, {
                method: 'GET',
                headers: {},
            });
            const data = await response.json();
            const mmr = await fetch(`https://api.henrikdev.xyz/valorant/v2/mmr/${data['data']['region']}/${user}/${tag}` + key, {
                method: 'GET',
                headers: {},
            });
            const mmrdata = await mmr.json();
            // console.log(mmrdata)

            if (mmrdata['data']['current_data']['currenttierpatched'] == 'Unrated' || mmrdata['data']['current_data']['currenttierpatched'] == 'unrated') {
                mmrdata['data']['current_data']['currenttierpatched'] = 'Unrated_undefined_Rank'
            }
            else {
                let rank = mmrdata['data']['current_data']['currenttierpatched'].split(' ')
                patchedRank = rank[0] + '_' + rank[1] + '_Rank'
                mmrdata['data']['current_data']['currenttierpatched'] = patchedRank
            }

            if (mmrdata['data']['highest_rank']['patched_tier'] == 'Unrated' || mmrdata['data']['highest_rank']['patched_tier'] == 'unrated') {
                mmrdata['data']['highest_rank']['patched_tier'] = 'Unrated_undefined_Rank'
            }
            else {
                let rank = mmrdata['data']['highest_rank']['patched_tier'].split(' ')
                patchedRank = rank[0] + '_' + rank[1] + '_Rank'
                mmrdata['data']['highest_rank']['patched_tier'] = patchedRank
            }
            // console.log(data['data'])
            return {
                username: data['data']['name'],
                tag: data['data']['tag'],
                puuid: data['data']['puuid'],
                small_card: data['data']['card']['small'],
                acc_lvl: data['data']['account_level'],
                reg: data['data']['region'],
                current_rank: mmrdata['data']['current_data']['currenttierpatched'],
                peak_rank: {
                    rank: mmrdata['data']['highest_rank']['patched_tier'],
                    season: mmrdata['data']['highest_rank']['season']
                }
            }
        }
        catch (err) {
            // console.log(err)
            return {
                username: '404_error',
                tag: '404_error',
                puuid: '404_error',
                small_card: '404_error',
                acc_lvl: '404_error',
                reg: '404_error',
                current_rank: '404_error',
                peak_rank: {
                    rank: '404_error',
                    season: '404_error'
                }

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
            }
        }
        catch {
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
        try {
            const response = await fetch(`https://api.henrikdev.xyz/valorant/v2/match/${matchid}` + key, {
                method: 'GET',
                headers: {},
            });
            // console.log(response)
            const data = await response.json();
            if (data.errors){
                throw new Error
            }
            return data
        }
        catch {
            return undefined
        }

    },
    getData: async function () {
        const response = await fetch('https://api.henrikdev.xyz/valorant/v1/content' + key, {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        const wrongActs = ["ac12e9b3-47e6-9599-8fa1-0bb473e5efc7","5adc33fa-4f30-2899-f131-6fba64c5dd3a","4c4b8cff-43eb-13d3-8f14-96b783c90cd2","c470d964-4bf4-1261-87aa-c484252f2d66"]
        data.acts = data.acts.filter(ep => !wrongActs.includes(ep.id));
        // for (let ep of data.acts){
        //     if (ep.id == "439dd42d-4a59-9e41-b50b-1ebb6810f22c"){
        //         ep.name = 'EPISODE 10'
        //     }
        // }
        return data
    },
    activeSeason: async function () {
        const data = await this.getData()
        let actsList = data['acts']
        // console.log(actsList)
        let currentAct = []
        for (a in actsList) {
            if (actsList[a].isActive) {
                currentAct.push(actsList[a])
            }
        }
        //  console.log(currentAct)
        return currentAct
    },
    getStoredComp: async function (region,name,tag) {
        const response = await fetch(`https://api.henrikdev.xyz/valorant/v1/stored-matches/${region}/${name}/${tag}` + key + "&modes_api=competitive", {
            method: 'GET',
            headers: {},
        });
        const data = await response.json();
        return data
    }
};

module.exports = UserData;
