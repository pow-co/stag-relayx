
const axios = require('axios')

import { Currency, Currencies } from './currency'

import BigNumber from 'bignumber.js'

export interface Balance {

  currency: Currency;

  amount: number;

}

export async function convertBalance(balance: Balance, currency: Currency): Promise<Balance> {

  const api = 'https://api.anypayx.com'

  if (balance.currency === Currencies.Satoshis) {

    balance.amount = new BigNumber(balance.amount).dividedBy(100000000).toNumber()

    balance.currency = Currencies.BSV

  }

  let { data } = await axios.get(`${api}/convert/${balance.amount}-${balance.currency}/to-${currency}`)

  let amount = data.conversion.output.value

  return {

    amount,

    currency

  }

}

