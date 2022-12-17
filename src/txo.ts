
import bsv, { Transaction } from 'bsv'

export function  fromTx(transaction: string, options: any={}): Promise<any> {
  return new Promise(function(resolve, reject) {
    let gene = new Transaction(transaction);
    let t = gene.toObject()
    let result = [];
    let inputs: any[] = [];
    let outputs: any[] = [];
    let graph = {};
    if (gene.inputs) {
      gene.inputs.forEach(function(input: any, input_index: any) {
        if (input.script) {
          let xput: any = { i: input_index, seq: input.sequenceNumber }
          input.script.chunks.forEach(function(c: any, chunk_index: string) {
            let chunk = c;
            if (c.buf) {
              if (c.buf.byteLength >= 1000000) {
                xput["xlb" + chunk_index] = c.buf.toString("base64")
              } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
                xput["lb" + chunk_index] = c.buf.toString('base64')
              } else {
                xput["b" + chunk_index] = c.buf.toString('base64')
              }
              if (options && options.h && options.h > 0) {
                xput["h" + chunk_index] = c.buf.toString('hex')
              }
            } else {
              if (typeof c.opcodenum !== 'undefined') {
                xput["b" + chunk_index] = {
                  op: c.opcodenum
                }
              } else {
                xput["b" + chunk_index] = c;
              }
            }
          })
          let sender: any = {
            h: input.prevTxId.toString('hex'),
            i: input.outputIndex
          }
          let address = input.script.toAddress(bsv.Networks.livenet).toString()
          if (address && address.length > 0) {
            sender.a = address;
          }
          xput.e = sender;
          inputs.push(xput)
        }
      })
    }
    if (gene.outputs) {
      gene.outputs.forEach(function(output: any, output_index: any) {
        if (output.script) {
          let xput: any = { i: output_index }
          output.script.chunks.forEach(function(c: any, chunk_index: any) {
            let chunk = c;
            if (c.buf) {
              if (c.buf.byteLength >= 1000000) {
                xput["xlb" + chunk_index] = c.buf.toString('base64')
                xput["xls" + chunk_index] = c.buf.toString('utf8')
              } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
                xput["lb" + chunk_index] = c.buf.toString('base64')
                xput["ls" + chunk_index] = c.buf.toString('utf8')
              } else {
                xput["b" + chunk_index] = c.buf.toString('base64')
                xput["s" + chunk_index] = c.buf.toString('utf8')
              }
              if (options && options.h && options.h > 0) {
                xput["h" + chunk_index] = c.buf.toString('hex')
              }
            } else {
              if (typeof c.opcodenum !== 'undefined') {
                xput["b" + chunk_index] = {
                  op: c.opcodenum
                }
              } else {
                xput["b" + chunk_index] = c;
              }
            }
          })
          let receiver: any = {
            v: output.satoshis,
            i: output_index
          }
          let address = output.script.toAddress(bsv.Networks.livenet).toString()
          if (address && address.length > 0) {
            receiver.a = address;
          }
          xput.e = receiver;
          outputs.push(xput)
        }
      })
    }
    let r: any = {
      tx: { h: t.hash },
      in: inputs,
      out: outputs,
      lock: t.nLockTime
    }
    // confirmations
    if (options && options.confirmations) {
      r.confirmations = options.confirmations
    }
    resolve(r)
  })
}
