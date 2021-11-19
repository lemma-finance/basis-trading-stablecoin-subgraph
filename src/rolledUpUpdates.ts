import {
    User, USDL, XUSDL,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { XUSDL_ADDRESS } from './const';
import { Address, BigInt, BigDecimal, ByteArray, ethereum } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";


export function updateRolledUpData(event: ethereum.Event): void {
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
    }
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }

    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp)// get unique hour within unix history
    let hourStartUnix = hourIndex * 3600 // want the rounded effect
    let hourlyVolume = HourlyVolume.load(hourStartUnix.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourStartUnix.toString())
    }

    // Daily
    let dayID = calcDayId(timestamp) // rounded
    let dayStartTimestamp = dayID * 86400
    let dailyVolume = DailyVolume.load(dayStartTimestamp.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayStartTimestamp.toString())
    }

    // Monthly
    let monthID = calcMonthId(timestamp) // rounded
    let monthStartTimestamp = monthID * 2592000
    let monthlyVolume = MonthlyVolume.load(monthStartTimestamp.toString())
    if (monthlyVolume === null) {
        monthlyVolume = new MonthlyVolume(monthStartTimestamp.toString())
    }

    hourlyVolume.hourlyUSDLTotalSupply = usdl.totalSupply
    dailyVolume.dailyUSDLTotalSupply = usdl.totalSupply
    monthlyVolume.monthlyUSDLTotalSupply = usdl.totalSupply

    hourlyVolume.hourlyxUSDLTotalSupply = xUSDL.totalSupply
    dailyVolume.dailyxUSDLTotalSupply = xUSDL.totalSupply
    monthlyVolume.monthlyxUSDLTotalSupply = xUSDL.totalSupply

    hourlyVolume.save()
    dailyVolume.save()
    monthlyVolume.save()
}

export function updateUserRolledUpData(event: ethereum.Event, user: User): void {
    let timestamp = event.block.timestamp.toI32()

    // Hourly
    let hourIndex = calcHourId(timestamp) // get unique hour within unix history
    let userHourID = user.id
        .toString()
        .concat('-')
        .concat(hourIndex.toString())
    let hourlyUserTrack = HourlyUserTrack.load(userHourID.toString())
    if (hourlyUserTrack === null) {
        hourlyUserTrack = new HourlyUserTrack(userHourID.toString())
    }
    hourlyUserTrack.user = user.id
    hourlyUserTrack.hourlyEntryValue = user.entryValue
    hourlyUserTrack.hourlyUsdLBalance = user.usdLBalance
    hourlyUserTrack.hourlyXusdlBalance = user.xUSDLBalance
    hourlyUserTrack.save()

    // Daily
    let dayID = calcDayId(timestamp) // rounded
    let userDailyID = user.id
        .toString()
        .concat('-')
        .concat(dayID.toString())
    let dailyUserTrack = DailyUserTrack.load(userDailyID.toString())
    if (dailyUserTrack === null) {
        dailyUserTrack = new DailyUserTrack(userDailyID.toString())
    }
    dailyUserTrack.user = user.id
    dailyUserTrack.dailyEntryValue = user.entryValue
    dailyUserTrack.dailyUsdLBalance = user.usdLBalance
    dailyUserTrack.dailyXusdlBalance = user.xUSDLBalance
    dailyUserTrack.save()
}
export function updateAPYRolledUpData(event: ethereum.Event, usdEarnings: BigDecimal): void {
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
    }
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }
    let timestamp = event.block.timestamp.toI32()
    let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())

    // Daily APY
    let dailyIndex = calcDayId(timestamp) // get unique daily within unix history
    let dailyAPYs = DailyAPY.load(dailyIndex.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dailyIndex.toString())
    }
    dailyAPYs.dailyUSDEarnings = dailyAPYs.dailyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        dailyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(dailyAPYs.avgUSDEarningPerUSDL, dailyAPYs.dailyUSDEarnings, xUSDLUser.usdLBalance)
        // DAILY APY = (daily USD earnings / avg USDL balance of xUSDL) * 100 * 365
        const timePerYear = BigDecimal.fromString("1").div(BigDecimal.fromString("365"));
        dailyAPYs.dailyApy =
            calcAPY(dailyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    dailyAPYs.save()

    // Weekly APY
    let weeklyIndex = calcWeekId(timestamp) // get unique weekly within unix history
    let weeklyAPYs = WeeklyAPY.load(weeklyIndex.toString())
    if (weeklyAPYs === null) {
        weeklyAPYs = new WeeklyAPY(weeklyIndex.toString())
    }
    weeklyAPYs.weeklyUSDEarnings = weeklyAPYs.weeklyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        weeklyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(weeklyAPYs.avgUSDEarningPerUSDL, weeklyAPYs.weeklyUSDEarnings, xUSDLUser.usdLBalance)
        // DAILY APY = (weekly USD earnings / avg USDL balance of xUSDL) * 100 * 365
        const timePerYear = BigDecimal.fromString("1").div(BigDecimal.fromString("365"));
        weeklyAPYs.weeklyApy =
            calcAPY(weeklyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    weeklyAPYs.save()

    // Monthly APY
    let monthlyIndex = calcMonthId(timestamp) // get unique monthly within unix history
    let monthlyAPYs = MonthlyAPY.load(monthlyIndex.toString())
    if (monthlyAPYs === null) {
        monthlyAPYs = new MonthlyAPY(monthlyIndex.toString())
    }
    monthlyAPYs.monthlyUSDEarnings = monthlyAPYs.monthlyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        monthlyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(monthlyAPYs.avgUSDEarningPerUSDL, monthlyAPYs.monthlyUSDEarnings, xUSDLUser.usdLBalance)
        // DAILY APY = (monthly USD earnings / avg USDL balance of xUSDL) * 100 * 365
        const timePerYear = BigDecimal.fromString("1").div(BigDecimal.fromString("365"));
        monthlyAPYs.monthlyApy =
            calcAPY(monthlyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    monthlyAPYs.save()

}

function calcAPY(avgUSDEarningPerUSDL: BigDecimal, timePerYear: BigDecimal): BigDecimal {
    return avgUSDEarningPerUSDL.times(BigDecimal.fromString('100')).times(timePerYear)
}
function calcAvgUSDEarningPerUSDL(avgUSDEarningPerUSDL: BigDecimal, USDEarnings: BigDecimal, usdlBalanceForXusdlContract: BigDecimal): BigDecimal {
    if (avgUSDEarningPerUSDL === ZERO_BD) {
        avgUSDEarningPerUSDL = USDEarnings.div(usdlBalanceForXusdlContract)
    } else {
        avgUSDEarningPerUSDL =
            avgUSDEarningPerUSDL
                .plus(USDEarnings.div(usdlBalanceForXusdlContract))
                .div(BigDecimal.fromString('2'))
    }
    return avgUSDEarningPerUSDL;

}

function calcHourId(timestamp: number): number {
    return timestamp / 3600
}
function calcDayId(timestamp: number): number {
    return timestamp / 86400
}
function calcWeekId(timestamp: number): number {
    return timestamp / 604800
}
function calcMonthId(timestamp: number): number {
    return timestamp / 2592000
}

