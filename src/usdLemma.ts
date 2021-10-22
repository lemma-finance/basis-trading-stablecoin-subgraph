import { Transfer, Rebalance, FeesUpdated } from '../generated/USDLemma/USDLemma'
import { TransferDone, User, USDL, XUSDL, HourlyVolume, DailyVolume, MonthlyVolume } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18 } from "./utils";
import { XUSDL_ADDRESS } from './const';

export function handleTransfer(event: Transfer): void {

    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = timestamp / 3600 // get unique hour within unix history
    let hourStartUnix = hourIndex * 3600 // want the rounded effect
    let hourlyVolume = HourlyVolume.load(hourStartUnix.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourStartUnix.toString())
        hourlyVolume.hourlyxUSDLTotalSupply = ZERO_BD;
        hourlyVolume.hourlyxUSDLTotalSupply = ZERO_BD
    }

    // Daily
    let dayID = timestamp / 86400 // rounded
    let dayStartTimestamp = dayID * 86400
    let dailyVolume = DailyVolume.load(dayStartTimestamp.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayStartTimestamp.toString())
        dailyVolume.dailyUSDLTotalSupply = ZERO_BD;
        dailyVolume.dailyUSDLTotalSupply = ZERO_BD
    }

    // Monthly
    let monthID = timestamp / 2592000 // rounded
    let monthStartTimestamp = monthID * 2592000
    let monthlyVolume = MonthlyVolume.load(monthStartTimestamp.toString())
    if (monthlyVolume === null) {
        monthlyVolume = new MonthlyVolume(monthStartTimestamp.toString())
        monthlyVolume.monthlyUSDLTotalSupply = ZERO_BD;
        monthlyVolume.monthlyxUSDLTotalSupply = ZERO_BD
    }

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
        usdl.save()
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
        usdl.save()
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

    }

    hourlyVolume.hourlyUSDLTotalSupply = usdl.totalSupply;
    hourlyVolume.save()

    dailyVolume.dailyUSDLTotalSupply = usdl.totalSupply
    dailyVolume.save()

    monthlyVolume.monthlyUSDLTotalSupply = usdl.totalSupply
    monthlyVolume.save()

    let usdl1 = USDL.load(usdlId);
    if (usdl1 !== null) {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            usdl1.multiplier = usdl1.totalSupply.div(xUSDLUser.usdLBalance)
        }
        usdl1.save()
    }

    const xUSDLId = "1";
    let xUSDL = XUSDL.load(xUSDLId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(xUSDLId)
        xUSDL.totalSupply = ZERO_BD
        xUSDL.pricePerShare = ZERO_BD
    }

    if (xUSDL.totalSupply.notEqual(ZERO_BD)) {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            pricePerShare = pricePerShare.truncate(18)
            xUSDL.pricePerShare = pricePerShare
        }
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

export function handleRebalance(event: Rebalance): void {    
    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.totalSupply = ZERO_BD
        xUSDL.pricePerShare = ZERO_BD
        xUSDL.USDEarnings = ZERO_BD
    }

    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
        usdl.totalSupply = ZERO_BD
        usdl.multiplier = ZERO_BD
        usdl.fees = ZERO_BD
    }

    // USDEarning += convertToDecimal(amount (emitted in reBalance event)) * (1 - usdl.fees)
    const valueInBD = convertToDecimal(event.params.amount, BI_18)
    const ONE = BigDecimal.fromString('1')
    xUSDL.USDEarnings = xUSDL.USDEarnings.plus(valueInBD.times(ONE.minus(usdl.fees)))
    xUSDL.save()
}

export function handleFeesUpdated(event: FeesUpdated): void {
    const fees = event.params.newFees
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
        usdl.totalSupply = ZERO_BD
        usdl.multiplier = ZERO_BD
        usdl.fees = ZERO_BD
    }
    usdl.fees = BigDecimal.fromString(fees.toString())
    usdl.save()
}
