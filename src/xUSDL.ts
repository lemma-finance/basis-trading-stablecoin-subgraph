import { Deposit, Transfer, UpdateMinimumLock } from '../generated/XUSDL/XUSDL'
import { XUSDL, User, HourlyUserTrack, DailyUserTrack, HourlyVolume, DailyVolume, MonthlyVolume } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { XUSDL_ADDRESS, LEMMA_ROUTER_ADDRESS } from './const';

export function handleDeposit(event: Deposit): void {
    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }
    let user = User.load(event.params.user.toHex())
    if (user === null) {
        user = new User(event.params.user.toHex())
    }
    const lemmaRouterUser = new User(Address.fromString(LEMMA_ROUTER_ADDRESS).toHex())
    if (user.id.toString() != lemmaRouterUser.id.toString()) {
        user.unlockBlock = event.block.number + xUSDL.minimumLock;
        user.save()
    }
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
        xUSDL.pricePerShare = ONE_BD
    }
    const valueInBD = convertToDecimal(event.params.value, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
            userTo.usdLBalance = ZERO_BD
            userTo.xUSDLBalance = ZERO_BD
            userTo.entryValue = ZERO_BD
        }
        userTo.xUSDLBalance = userTo.xUSDLBalance.plus(valueInBD)
        userTo.entryValue = userTo.entryValue.plus(xUSDL.pricePerShare.times(valueInBD))

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
        hourlyUserTrack.hourlyXusdlBalance = hourlyUserTrack.hourlyXusdlBalance.plus(valueInBD)
        hourlyUserTrack.hourlyEntryValue = hourlyUserTrack.hourlyEntryValue.plus(xUSDL.pricePerShare.times(valueInBD))

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
        dailyUserTrack.dailyXusdlBalance = dailyUserTrack.dailyXusdlBalance.plus(valueInBD)
        dailyUserTrack.dailyEntryValue = dailyUserTrack.dailyEntryValue.plus(xUSDL.pricePerShare.times(valueInBD))

        userTo.save()
        hourlyUserTrack.save()
        dailyUserTrack

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
            userFrom.entryValue = ZERO_BD
        }
        const oldBalance = userFrom.xUSDLBalance
        const updatedBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedBalance.div(oldBalance))
        userFrom.xUSDLBalance = updatedBalance


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
        hourlyUserTrack.hourlyXusdlBalance = hourlyUserTrack.hourlyXusdlBalance.minus(valueInBD)
        hourlyUserTrack.hourlyEntryValue = hourlyUserTrack.hourlyEntryValue.minus(xUSDL.pricePerShare.times(valueInBD))

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
        dailyUserTrack.dailyXusdlBalance = dailyUserTrack.dailyXusdlBalance.minus(valueInBD)
        dailyUserTrack.dailyEntryValue = dailyUserTrack.dailyEntryValue.minus(xUSDL.pricePerShare.times(valueInBD))

        userFrom.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

        xUSDL.totalSupply = xUSDL.totalSupply.minus(valueInBD);
        xUSDL.save()
    }
    //transfer
    else {

        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
        }
        userTo.entryValue = userTo.entryValue.plus(xUSDL.pricePerShare.times(valueInBD))
        userTo.xUSDLBalance = userTo.xUSDLBalance.plus(valueInBD)


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
        hourlyUserTrack.hourlyXusdlBalance = hourlyUserTrack.hourlyXusdlBalance.plus(valueInBD)

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
        dailyUserTrack.dailyXusdlBalance = dailyUserTrack.dailyXusdlBalance.plus(valueInBD)

        // userTo.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
        }

        const oldFromBalance = userFrom.xUSDLBalance
        const updatedFromBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedFromBalance.div(oldFromBalance))
        userFrom.xUSDLBalance = updatedFromBalance

        //handle the minimum lock
        //if transferred from router to some address then change the lock up time for that address
        const lemmaRouterUser = new User(Address.fromString(LEMMA_ROUTER_ADDRESS).toHex())
        if (userFrom.id.toString() == lemmaRouterUser.id.toString()) {
            userTo.unlockBlock = event.block.number + xUSDL.minimumLock;
        }
        userTo.save()


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
        hourlyUserFromTrack.hourlyXusdlBalance = hourlyUserFromTrack.hourlyXusdlBalance.minus(valueInBD)

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
        dailyUserFromTrack.dailyXusdlBalance = dailyUserFromTrack.dailyXusdlBalance.minus(valueInBD)

        userFrom.save()
        hourlyUserFromTrack.save()
        dailyUserFromTrack.save()
    }

    hourlyVolume.hourlyxUSDLTotalSupply = xUSDL.totalSupply;
    hourlyVolume.save()

    dailyVolume.dailyxUSDLTotalSupply = xUSDL.totalSupply
    dailyVolume.save()

    monthlyVolume.monthlyxUSDLTotalSupply = xUSDL.totalSupply
    monthlyVolume.save()

}
export function handleUpdateMinimumLock(event: UpdateMinimumLock): void {
    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }
    xUSDL.minimumLock = event.params.newLock
}
