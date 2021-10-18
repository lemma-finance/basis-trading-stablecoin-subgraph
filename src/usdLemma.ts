import { Transfer } from '../generated/USDLemma/USDLemma'
import { TransferDone, User, USDL } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';

const xUSDLAddress = "0x7A9Ec1d04904907De0ED7b6839CcdD59c3716AC9"
export function handleTransfer(event: Transfer): void {
    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    let transferDone = new TransferDone(id)
    transferDone.from = event.params.from
    transferDone.to = event.params.to
    transferDone.value = event.params.value
    transferDone.save()

    // let usdlAddress = event.transaction.to;
    // let usdlId: string;
    // if (usdlAddress !== null) {
    //     usdlId = usdlAddress.toHex()
    // }
    //TODO: ideally the id should be the USDL address. Figure out how to get it from the graph config?
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
        usdl.totalSupply = BigInt.zero()
        usdl.multiplier = BigDecimal.zero()
    }

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = BigInt.zero()
        }
        userTo.usdLBalance = userTo.usdLBalance.plus(event.params.value)
        userTo.save()

        usdl.totalSupply = usdl.totalSupply.plus(event.params.value)
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = BigInt.zero()
        }
        userFrom.usdLBalance = userFrom.usdLBalance.minus(event.params.value);
        userFrom.save()

        usdl.totalSupply = usdl.totalSupply.minus(event.params.value);
    }
    //transfer
    else {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = BigInt.zero()
        }
        userTo.usdLBalance = userTo.usdLBalance.plus(event.params.value)
        userTo.save()

        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = BigInt.zero()
        } else {
            userFrom.usdLBalance = userFrom.usdLBalance.minus(event.params.value);
        }
        userFrom.save()
    }


    let xUSDLUser = User.load(Address.fromString(xUSDLAddress).toHex())
    if (xUSDLUser !== null) {
        usdl.multiplier = (new BigDecimal(usdl.totalSupply)).div(new BigDecimal(xUSDLUser.usdLBalance))
    }

    usdl.save()
}


// export function handleUpdatedGravatar(event: UpdatedGravatar): void {
//     let id = event.params.id.toHex()
//     let gravatar = Gravatar.load(id)
//     if (gravatar === null) {
//         gravatar = new Gravatar(id)
//     }
//     gravatar.owner = event.params.owner
//     gravatar.displayName = event.params.displayName
//     gravatar.imageUrl = event.params.imageUrl
//     gravatar.save()
// }
