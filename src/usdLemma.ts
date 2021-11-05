import { Transfer, Rebalance, FeesUpdated } from '../generated/USDLemma/USDLemma'
import {
    TransferDone, User, USDL, XUSDL,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
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

        let userHourID = userTo.id
            .toString()
            .concat('-')
            .concat(hourIndex.toString())
        let hourlyUserTrack = HourlyUserTrack.load(userHourID.toString())
        if (hourlyUserTrack === null) {
            hourlyUserTrack = new HourlyUserTrack(userHourID.toString())
            hourlyUserTrack.hourlyUsdLBalance = ZERO_BD
            hourlyUserTrack.hourlyXusdlBalance = ZERO_BD
            hourlyUserTrack.hourlyEntryValue = ZERO_BD
        }
        hourlyUserTrack.user = userTo.id
        hourlyUserTrack.hourlyUsdLBalance = hourlyUserTrack.hourlyUsdLBalance.plus(valueInBD)

        let userDailyID = userTo.id
            .toString()
            .concat('-')
            .concat(dayID.toString())
        let dailyUserTrack = DailyUserTrack.load(userDailyID.toString())
        if (dailyUserTrack === null) {
            dailyUserTrack = new DailyUserTrack(userDailyID.toString())
            dailyUserTrack.dailyUsdLBalance = ZERO_BD
            dailyUserTrack.dailyXusdlBalance = ZERO_BD
            dailyUserTrack.dailyEntryValue = ZERO_BD
        }
        dailyUserTrack.user = userTo.id
        dailyUserTrack.dailyUsdLBalance = dailyUserTrack.dailyUsdLBalance.plus(valueInBD)

        userTo.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

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

        let userHourID = userFrom.id
            .toString()
            .concat('-')
            .concat(hourIndex.toString())
        let hourlyUserTrack = HourlyUserTrack.load(userHourID.toString())
        if (hourlyUserTrack === null) {
            hourlyUserTrack = new HourlyUserTrack(userHourID.toString())
            hourlyUserTrack.hourlyUsdLBalance = ZERO_BD
            hourlyUserTrack.hourlyXusdlBalance = ZERO_BD
            hourlyUserTrack.hourlyEntryValue = ZERO_BD
        }
        hourlyUserTrack.user = userFrom.id
        hourlyUserTrack.hourlyUsdLBalance = hourlyUserTrack.hourlyUsdLBalance.minus(valueInBD)

        let userDailyID = userFrom.id
            .toString()
            .concat('-')
            .concat(dayID.toString())
        let dailyUserTrack = DailyUserTrack.load(userDailyID.toString())
        if (dailyUserTrack === null) {
            dailyUserTrack = new DailyUserTrack(userDailyID.toString())
            dailyUserTrack.dailyUsdLBalance = ZERO_BD
            dailyUserTrack.dailyXusdlBalance = ZERO_BD
            dailyUserTrack.dailyEntryValue = ZERO_BD
        }
        dailyUserTrack.user = userFrom.id
        dailyUserTrack.dailyUsdLBalance = dailyUserTrack.dailyUsdLBalance.minus(valueInBD)

        userFrom.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

        usdl.totalSupply = usdl.totalSupply.minus(valueInBD);
        usdl.save()
    }
    //transfer
    else {

        // userTo
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
        }
        userTo.usdLBalance = userTo.usdLBalance.plus(valueInBD)

        let userHourID = userTo.id
            .toString()
            .concat('-')
            .concat(hourIndex.toString())
        let hourlyUserTrack = HourlyUserTrack.load(userHourID.toString())
        if (hourlyUserTrack === null) {
            hourlyUserTrack = new HourlyUserTrack(userHourID.toString())
            hourlyUserTrack.hourlyUsdLBalance = ZERO_BD
            hourlyUserTrack.hourlyXusdlBalance = ZERO_BD
            hourlyUserTrack.hourlyEntryValue = ZERO_BD
        }
        hourlyUserTrack.user = userTo.id
        hourlyUserTrack.hourlyUsdLBalance = hourlyUserTrack.hourlyUsdLBalance.plus(valueInBD)

        let userDailyID = userTo.id
            .toString()
            .concat('-')
            .concat(dayID.toString())
        let dailyUserTrack = DailyUserTrack.load(userDailyID.toString())
        if (dailyUserTrack === null) {
            dailyUserTrack = new DailyUserTrack(userDailyID.toString())
            dailyUserTrack.dailyUsdLBalance = ZERO_BD
            dailyUserTrack.dailyXusdlBalance = ZERO_BD
            dailyUserTrack.dailyEntryValue = ZERO_BD
        }
        dailyUserTrack.user = userTo.id
        dailyUserTrack.dailyUsdLBalance = dailyUserTrack.dailyUsdLBalance.plus(valueInBD)

        userTo.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

        // userFrom
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.usdLBalance = userFrom.usdLBalance.minus(valueInBD);

        let userFromHourID = userFrom.id
            .toString()
            .concat('-')
            .concat(hourIndex.toString())
        let hourlyUserFromTrack = HourlyUserTrack.load(userFromHourID.toString())
        if (hourlyUserFromTrack === null) {
            hourlyUserFromTrack = new HourlyUserTrack(userFromHourID.toString())
            hourlyUserFromTrack.hourlyUsdLBalance = ZERO_BD
            hourlyUserFromTrack.hourlyXusdlBalance = ZERO_BD
            hourlyUserFromTrack.hourlyEntryValue = ZERO_BD
        }
        hourlyUserFromTrack.user = userFrom.id
        hourlyUserFromTrack.hourlyUsdLBalance = hourlyUserFromTrack.hourlyUsdLBalance.minus(valueInBD)

        let userFromDailyID = userFrom.id
            .toString()
            .concat('-')
            .concat(dayID.toString())
        let dailyUserFromTrack = DailyUserTrack.load(userFromDailyID.toString())
        if (dailyUserFromTrack === null) {
            dailyUserFromTrack = new DailyUserTrack(userFromDailyID.toString())
            dailyUserFromTrack.dailyUsdLBalance = ZERO_BD
            dailyUserFromTrack.dailyXusdlBalance = ZERO_BD
            dailyUserFromTrack.dailyEntryValue = ZERO_BD
        }
        dailyUserFromTrack.user = userFrom.id
        dailyUserFromTrack.dailyUsdLBalance = dailyUserFromTrack.dailyUsdLBalance.minus(valueInBD)

        userFrom.save()
        hourlyUserFromTrack.save()
        dailyUserFromTrack.save()
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

    let timestamp = event.block.timestamp.toI32()
    let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())

    // Daily APY
    let dailyIndex = timestamp / 86400 // get unique daily within unix history
    let dailyStartUnix = dailyIndex * 86400 // want the rounded effect
    let dailyAPYs = DailyAPY.load(dailyStartUnix.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dailyStartUnix.toString())
        dailyAPYs.dailyUSDEarnings = ZERO_BD
        dailyAPYs.avgUSDLBalOfXusdlContract = ZERO_BD
        dailyAPYs.dailyApy = ZERO_BD
    }

    dailyAPYs.dailyUSDEarnings = dailyAPYs.dailyUSDEarnings.plus(valueInBD);

    if (xUSDLUser !== null) {
        const usdlBalanceForXusdlContract = xUSDLUser.usdLBalance
        if (dailyAPYs.avgUSDLBalOfXusdlContract === ZERO_BD) {
            dailyAPYs.avgUSDLBalOfXusdlContract = usdlBalanceForXusdlContract
        } else {
            dailyAPYs.avgUSDLBalOfXusdlContract =
                dailyAPYs.avgUSDLBalOfXusdlContract
                    .plus(usdlBalanceForXusdlContract)
                    .div(BigDecimal.fromString('2'))
        }

        // DAILY APY = (daily USD earnings / avg USDL balance of xUSDL) * 100 * 365
        dailyAPYs.dailyApy =
            (dailyAPYs.dailyUSDEarnings
                .div(dailyAPYs.avgUSDLBalOfXusdlContract))
                .times(BigDecimal.fromString('100'))
                .times(BigDecimal.fromString('365'))
    }
    dailyAPYs.save()

    // Weekly APY
    // 7 days * 86400 = 604800
    let weeklyIndex = timestamp / 604800 // get unique Weekly within unix history
    let weeklyStartUnix = weeklyIndex * 604800 // want the rounded effect
    let weeklyAPYs = WeeklyAPY.load(weeklyStartUnix.toString())
    if (weeklyAPYs === null) {
        weeklyAPYs = new WeeklyAPY(weeklyStartUnix.toString())
        weeklyAPYs.weeklyUSDEarnings = ZERO_BD
        weeklyAPYs.avgUSDLBalOfXusdlContract = ZERO_BD
        weeklyAPYs.weeklyApy = ZERO_BD
    }

    weeklyAPYs.weeklyUSDEarnings = weeklyAPYs.weeklyUSDEarnings.plus(valueInBD);

    if (xUSDLUser !== null) {
        const usdlBalanceForXusdlContract = xUSDLUser.usdLBalance
        if (weeklyAPYs.avgUSDLBalOfXusdlContract === ZERO_BD) {
            weeklyAPYs.avgUSDLBalOfXusdlContract = usdlBalanceForXusdlContract
        } else {
            weeklyAPYs.avgUSDLBalOfXusdlContract =
                weeklyAPYs.avgUSDLBalOfXusdlContract
                    .plus(usdlBalanceForXusdlContract)
                    .div(BigDecimal.fromString('2'))
        }

        // Weekly APY = (weekly USD earnings / avg USDL balance of xUSDL) * 100 * 52.14
        weeklyAPYs.weeklyApy =
            (weeklyAPYs.weeklyUSDEarnings
                .div(weeklyAPYs.avgUSDLBalOfXusdlContract))
                .times(BigDecimal.fromString('100'))
                .times(BigDecimal.fromString('52.14'))
    }
    weeklyAPYs.save()

    // Monthly APY
    // 30 days * 86400 = 2592000
    let monthlyIndex = timestamp / 2592000 // get unique monthly within unix history
    let monthlyStartUnix = monthlyIndex * 2592000 // want the rounded effect
    let monthlyAPYs = MonthlyAPY.load(monthlyStartUnix.toString())
    if (monthlyAPYs === null) {
        monthlyAPYs = new MonthlyAPY(monthlyStartUnix.toString())
        monthlyAPYs.monthlyUSDEarnings = ZERO_BD
        monthlyAPYs.avgUSDLBalOfXusdlContract = ZERO_BD
        monthlyAPYs.monthlyApy = ZERO_BD
    }

    monthlyAPYs.monthlyUSDEarnings = monthlyAPYs.monthlyUSDEarnings.plus(valueInBD);

    if (xUSDLUser !== null) {
        const usdlBalanceForXusdlContract = xUSDLUser.usdLBalance
        if (monthlyAPYs.avgUSDLBalOfXusdlContract === ZERO_BD) {
            monthlyAPYs.avgUSDLBalOfXusdlContract = usdlBalanceForXusdlContract
        } else {
            monthlyAPYs.avgUSDLBalOfXusdlContract =
                monthlyAPYs.avgUSDLBalOfXusdlContract
                    .plus(usdlBalanceForXusdlContract)
                    .div(BigDecimal.fromString('2'))
        }

        // monthly APY = (monthly USD earnings / avg USDL balance of xUSDL) * 100 * 12
        monthlyAPYs.monthlyApy =
            (monthlyAPYs.monthlyUSDEarnings
                .div(monthlyAPYs.avgUSDLBalOfXusdlContract))
                .times(BigDecimal.fromString('100'))
                .times(BigDecimal.fromString('12'))
    }
    monthlyAPYs.save()

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
    const BI_4 = BigInt.fromI32(4)//fees are in bps
    usdl.fees = convertToDecimal(fees, BI_4)
    usdl.save()
}
