import { Deposit, Transfer } from '../generated/XUSDL/XUSDL'
import { XUSDL, User } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18 } from "./utils";
import { XUSDL_ADDRESS } from './const';


export function handleDeposit(event: Deposit): void {

    const xUSDLId = "1";
    let xUSDL = XUSDL.load(xUSDLId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(xUSDLId)
        xUSDL.totalSupply = ZERO_BD
        xUSDL.pricePerShare = ZERO_BD
    }
    // //stake
    const USDLAmountDeposited = convertToDecimal(event.params.amount, BI_18);
    let shares = ZERO_BD;//xUSDLToMint

    if (xUSDL.totalSupply.equals(ZERO_BD)) {
        shares = USDLAmountDeposited;
    } else {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            pricePerShare = pricePerShare.truncate(18)

            shares = USDLAmountDeposited.div(pricePerShare)
            shares = shares.truncate(18)

            xUSDL.pricePerShare = pricePerShare
        }
    }
    xUSDL.save()

}

export function handleTransfer(event: Transfer): void {

    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.totalSupply = ZERO_BD
        xUSDL.pricePerShare = ZERO_BD
    }
    const valueInBD = convertToDecimal(event.params.value, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.xUSDLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.xUSDLBalance = userTo.xUSDLBalance.plus(valueInBD)
        userTo.save()

        xUSDL.totalSupply = xUSDL.totalSupply.plus(valueInBD)
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.xUSDLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.xUSDLBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.save()

        xUSDL.totalSupply = xUSDL.totalSupply.minus(valueInBD);
    }
    //transfer
    else {

        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.xUSDLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.xUSDLBalance = userTo.xUSDLBalance.plus(valueInBD)
        userTo.save()

        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.xUSDLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.xUSDLBalance = userFrom.xUSDLBalance.minus(valueInBD);

        userFrom.save()
    }
    xUSDL.save()
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
