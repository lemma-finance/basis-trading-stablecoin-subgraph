import { Transfer } from '../generated/USDLemma/USDLemma'
import { TransferDone, User, USDL } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18 } from "./utils";
// const xUSDLAddress = "0xD42912755319665397FF090fBB63B1a31aE87Cee"
const xUSDLAddress = "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf"
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
        usdl.totalSupply = ZERO_BD
        usdl.multiplier = ZERO_BD
    }
    const valueInBD = convertToDecimal(event.params.value, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.usdLBalance = userTo.usdLBalance.plus(valueInBD)
        userTo.save()

        usdl.totalSupply = usdl.totalSupply.plus(valueInBD)
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.usdLBalance = userFrom.usdLBalance.minus(valueInBD);
        userFrom.save()

        usdl.totalSupply = usdl.totalSupply.minus(valueInBD);
    }
    //transfer
    else {

        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.usdLBalance = userTo.usdLBalance.plus(valueInBD)
        userTo.save()

        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.usdLBalance = userFrom.usdLBalance.minus(valueInBD);

        userFrom.save()

        let xUSDLUser = User.load(Address.fromString(xUSDLAddress).toHex())
        if (xUSDLUser !== null) {
            usdl.multiplier = usdl.totalSupply.div(xUSDLUser.usdLBalance)
        }

        //     const xUSDLId = "1";
        //     let xUSDL = XUSDL.load(xUSDLId)
        //     if (xUSDL === null) {
        //         xUSDL = new XUSDL(xUSDLId)
        //         xUSDL.totalSupply = BigInt.zero()
        //         xUSDL.pricePerShare = BigDecimal.zero()
        //     }

        //     if (event.params.to === Address.fromString(xUSDLAddress)) {
        //         //stake
        //         const USDLAmountDeposited = BigInt.fromString(event.params.value.toString());
        //         const ONE = BigInt.fromString("1").pow(BigInt.fromString("18"))
        //         let shares = BigInt.zero();//xUSDLToMint

        //         if (xUSDL.totalSupply === BigInt.zero()) {
        //             shares = USDLAmountDeposited;
        //         } else {
        //             let pricePerShare = xUSDLUser.usdLBalance.times(ONE).div(xUSDL.totalSupply)
        //             shares = USDLAmountDeposited.times(ONE).div(pricePerShare)
        //         }
        //         xUSDL.totalSupply = xUSDL.totalSupply.plus(shares)
        //         userFrom.xUSDLBalance = userFrom.xUSDLBalance.plus(shares)
        //     }


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
