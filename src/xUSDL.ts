import { Deposit, Transfer } from '../generated/XUSDL/XUSDL'
import { XUSDL, User, HourlyVolume, DailyVolume, MonthlyVolume } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18 } from "./utils";
import { XUSDL_ADDRESS } from './const';


export function handleDeposit(event: Deposit): void {

}

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
            userTo.usdLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.xUSDLBalance = userTo.xUSDLBalance.plus(valueInBD)
        userTo.save()

        xUSDL.totalSupply = xUSDL.totalSupply.plus(valueInBD)
        xUSDL.save()
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
        userFrom.xUSDLBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.save()

        xUSDL.totalSupply = xUSDL.totalSupply.minus(valueInBD);
        xUSDL.save()
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

    hourlyVolume.hourlyxUSDLTotalSupply = xUSDL.totalSupply;
    hourlyVolume.save()

    dailyVolume.dailyxUSDLTotalSupply = xUSDL.totalSupply
    dailyVolume.save()

    monthlyVolume.monthlyxUSDLTotalSupply = xUSDL.totalSupply
    monthlyVolume.save()

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
