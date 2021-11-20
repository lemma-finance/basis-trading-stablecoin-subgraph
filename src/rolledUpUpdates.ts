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
    let hourlyVolume = HourlyVolume.load(hourIndex.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourIndex.toString())
    }

    // Daily
    let dayIndex = calcDayId(timestamp) // rounded
    let dailyVolume = DailyVolume.load(dayIndex.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayIndex.toString())
    }

    // Monthly
    let monthIndex = calcMonthId(timestamp) // rounded
    let monthlyVolume = MonthlyVolume.load(monthIndex.toString())
    if (monthlyVolume === null) {
        monthlyVolume = new MonthlyVolume(monthIndex.toString())
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
    let dayIndex = calcDayId(timestamp) // rounded
    let userDailyID = user.id
        .toString()
        .concat('-')
        .concat(dayIndex.toString())
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
    let dayIndex = calcDayId(timestamp) // get unique daily within unix history
    let dailyAPYs = DailyAPY.load(dayIndex.toString())
    if (dailyAPYs === null) {
        dailyAPYs = new DailyAPY(dayIndex.toString())
    }
    dailyAPYs.dailyUSDEarnings = dailyAPYs.dailyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        dailyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(dailyAPYs.avgUSDEarningPerUSDL, dailyAPYs.dailyUSDEarnings, xUSDLUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("365");
        dailyAPYs.dailyApy =
            calcAPY(dailyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    dailyAPYs.save()

    // Weekly APY
    let weekIndex = calcWeekId(timestamp) // get unique weekly within unix history
    let weeklyAPYs = WeeklyAPY.load(weekIndex.toString())
    if (weeklyAPYs === null) {
        weeklyAPYs = new WeeklyAPY(weekIndex.toString())
    }
    weeklyAPYs.weeklyUSDEarnings = weeklyAPYs.weeklyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        weeklyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(weeklyAPYs.avgUSDEarningPerUSDL, weeklyAPYs.weeklyUSDEarnings, xUSDLUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("52.1429");
        weeklyAPYs.weeklyApy =
            calcAPY(weeklyAPYs.avgUSDEarningPerUSDL, timePerYear)
    }
    weeklyAPYs.save()

    // Monthly APY
    let monthIndex = calcMonthId(timestamp) // get unique monthly within unix history
    let monthlyAPYs = MonthlyAPY.load(monthIndex.toString())
    if (monthlyAPYs === null) {
        monthlyAPYs = new MonthlyAPY(monthIndex.toString())
    }
    monthlyAPYs.monthlyUSDEarnings = monthlyAPYs.monthlyUSDEarnings.plus(usdEarnings)

    if (xUSDLUser !== null) {
        monthlyAPYs.avgUSDEarningPerUSDL = calcAvgUSDEarningPerUSDL(monthlyAPYs.avgUSDEarningPerUSDL, monthlyAPYs.monthlyUSDEarnings, xUSDLUser.usdLBalance)
        const timePerYear = BigDecimal.fromString("12");
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
    return calcIntervalId(timestamp, 3600)
}
function calcDayId(timestamp: number): number {
    return calcIntervalId(timestamp, 86400)
}
function calcWeekId(timestamp: number): number {
    return calcIntervalId(timestamp, 604800)
}
function calcMonthId(timestamp: number): number {
    return calcIntervalId(timestamp, 2592000)
}
function calcIntervalId(timestamp: number, interval: number): number {
    return timestamp - timestamp % interval
}

