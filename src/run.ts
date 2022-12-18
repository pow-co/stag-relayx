
import axios from 'axios'

export async function broadcast (rawtx: string) {

  const { data } = await axios.post(`https://api.run.network/v1/main/tx`, {
    rawtx
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })

  return data
}


const Run = require('run-sdk')

const blockchain = new Run.plugins.WhatsOnChain({ network: 'main' })

export const run = new Run({ blockchain })

export interface RunUtxo {
  txid: string;
  vout: number;
  script: string;
  satoshis: number;
}

interface TokenBalancesResponse {
  balances: any;
  metadata: any;
}

export async function listTokenBalances(address: string): Promise<TokenBalancesResponse> {

  const { data } = await axios.get(`https://staging-backend.relayx.com/api/user/balance2/#${address}`)

  return data.data

}
