import { Deposit } from '../generated/XUSDL/XUSDL'
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
        }
    }
    xUSDL.totalSupply = xUSDL.totalSupply.plus(shares)
    xUSDL.save()

    let user = User.load(event.params.user.toHex())
    if (user !== null) {
        user.xUSDLBalance = user.xUSDLBalance.plus(shares)
        user.save()
    }

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
