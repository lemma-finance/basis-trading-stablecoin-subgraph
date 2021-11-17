//TODO: restructure and add all the hourly,daily,weekly,monthly updates here to make it easier to read and understand

import {
    TransferDone, User, USDL, XUSDL,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
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
    let hourIndex = timestamp / 3600 // get unique hour within unix history
    let hourStartUnix = hourIndex * 3600 // want the rounded effect
    let hourlyVolume = HourlyVolume.load(hourStartUnix.toString())
    if (hourlyVolume === null) {
        hourlyVolume = new HourlyVolume(hourStartUnix.toString())
    }

    // Daily
    let dayID = timestamp / 86400 // rounded
    let dayStartTimestamp = dayID * 86400
    let dailyVolume = DailyVolume.load(dayStartTimestamp.toString())
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(dayStartTimestamp.toString())
    }

    // Monthly
    let monthID = timestamp / 2592000 // rounded
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
    let hourIndex = timestamp / 3600 // get unique hour within unix history
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
    let dayID = timestamp / 86400 // rounded
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