import { Transfer, Rebalance, FeesUpdated } from '../generated/USDLemma/USDLemma'
import {
    TransferDone, User, USDL, XUSDL,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { XUSDL_ADDRESS } from './const';
import { updateRolledUpData, updateUserRolledUpData } from "./rolledUpUpdates"

export function handleTransfer(event: Transfer): void {

    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    let transferDone = new TransferDone(id)
    transferDone.from = event.params.from
    transferDone.to = event.params.to
    transferDone.value = event.params.value
    transferDone.save()

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

        }
        userTo.usdLBalance = userTo.usdLBalance.plus(valueInBD)
        userTo.save()
        updateUserRolledUpData(event, userTo)

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
        userFrom.usdLBalance = userFrom.usdLBalance.minus(valueInBD)
        userFrom.save()
        updateUserRolledUpData(event, userFrom)

        usdl.totalSupply = usdl.totalSupply.minus(valueInBD)
        usdl.save()

    }
    //transfer
    else {
        // userTo
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())

        }
        userTo.usdLBalance = userTo.usdLBalance.plus(valueInBD)
        userTo.save()
        updateUserRolledUpData(event, userTo)

        // userFrom
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
            userFrom.usdLBalance = ZERO_BD
            userFrom.xUSDLBalance = ZERO_BD
        }
        userFrom.usdLBalance = userFrom.usdLBalance.minus(valueInBD)
        userFrom.save()
        updateUserRolledUpData(event, userFrom)
    }

    let usdl1 = USDL.load(usdlId);
    if (usdl1 !== null) {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            usdl1.multiplier = usdl1.totalSupply.div(xUSDLUser.usdLBalance)
        }
        usdl1.save()
    }
    updateRolledUpData(event)
}

export function handleRebalance(event: Rebalance): void {
    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }

    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
    }

    // USDEarning += convertToDecimal(amount (emitted in reBalance event)) * (1 - usdl.fees)
    const valueInBD = convertToDecimal(event.params.amount, BI_18)
    const ONE = ONE_BD
    let USDEarning = valueInBD.le(ZERO_BD) ? valueInBD : xUSDL.USDEarnings.plus(valueInBD.times(ONE.minus(usdl.fees)))//if negative then no fees
    xUSDL.USDEarnings = xUSDL.USDEarnings.plus(USDEarning)
    xUSDL.save()

    let timestamp = event.block.timestamp.toI32()
    let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())

    // Daily APY
    let dailyIndex = timestamp / 86400 // get unique daily within unix history
    let dailyStartUnix = dailyIndex * 86400 // want the rounded effect
    let dailyAPYs = DailyAPY.load(dailyStartUnix.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dailyStartUnix.toString())
    }

    dailyAPYs.dailyUSDEarnings = dailyAPYs.dailyUSDEarnings.plus(USDEarning);

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
    }

    weeklyAPYs.weeklyUSDEarnings = weeklyAPYs.weeklyUSDEarnings.plus(USDEarning);

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
    }

    monthlyAPYs.monthlyUSDEarnings = monthlyAPYs.monthlyUSDEarnings.plus(USDEarning);

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

    //reBalance mints to/burns from xUSDL contract so it changes the pricePerShare
    if (xUSDL.totalSupply.notEqual(ZERO_BD)) {
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            xUSDL.pricePerShare = pricePerShare
        }
    }
    xUSDL.save()
    updateRolledUpData(event)
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

