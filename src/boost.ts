
import axios from 'axios'

import { PaymentRequest } from './anypay'

import { Script } from '@runonbitcoin/nimble'

const apiBase = `https://pow.co`

export interface BuyBoost {
    content: string;
    difficulty: number;
    value: number;
    tag?: Buffer;
    category?: Buffer;
}

export interface BuyBoostResult {
    txid: string;
    txhex: string;
    job: BoostpowJob;
}


interface RelayxSendResult {
    amount: number;
    currency: string;
    identity: string;
    paymail: string;
    rawTx: string;
    satoshis: number;
    txid: string;
}

interface BoostpowJob {
    additionalData: string;
    categeory: string;
    content: string;
    createdAt: string;
    difficulty: number;
    id: number;
    profitability: number;
    script: string;
    spent: boolean;
    spent_txid: string;
    spent_vout: number;
    tag: string;
    timestamp: string;
    tx_hex: string;
    txid: string;
    updatedAt: string;
    userNonce: string;
    value: number;
    vaout: number
}

interface BuyBoostOptions {
    outputs: any[]
}

export default function (relayone: any) {

    async function buy(buyBoost: BuyBoost, options: BuyBoostOptions={outputs: []}): Promise<BuyBoostResult> {

        const { content, difficulty, value, tag } = buyBoost

        var url = `${apiBase}/api/v1/boostpow/${content}/new?difficulty=${difficulty}`

        if (tag) {
            url = `${url}&tag=${tag}`
        }

        const { data } = await axios.get(url)

        const paymentRequest: PaymentRequest = data

        const script = Script.fromHex(paymentRequest.outputs[0].script);

        const send = {
            opReturn: [
                'onchain',
                '18pPQigu7j69ioDcUG9dACE1iAN9nCfowr', // boostpow bitcom
                'job',
                JSON.stringify({
                    index: 0
                })
            ],
            amount: value / 100_000_000,
            to: script.toASM(),
            currency: 'BSV'
        };

        console.log('stag.relayx.send', send)

        options.outputs?.push(send)

        const sendResult: RelayxSendResult = await relayone.send({
            outputs: options.outputs
        });

        const { data: powcoJobsSubmitResultData } = await axios.post(`${apiBase}/api/v1/boost/jobs`, {
            transaction: sendResult.rawTx
        })

        console.log('stag.powco.jobs.submit.result.data', powcoJobsSubmitResultData)

        const [job] = powcoJobsSubmitResultData.jobs

        const result = {
            txid: sendResult.txid,
            txhex: sendResult.rawTx,
            job
        }

        console.log('stag.relayx.send.result', result)

        return result

    }

    async function fetch({ txid }: { txid: string}): Promise<BoostpowJob> {

        const { data: { job }} = await axios.get(`${apiBase}/api/v1/boost/jobs/${txid}`)

        return job

    }

    return {

        buy,

        fetch

    }

}
