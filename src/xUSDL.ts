import { Deposit, Withdraw, Transfer, UpdateMinimumLock } from '../generated/XUSDL/XUSDL'
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
    //calc unlockBlock
    const lemmaRouterUser = new User(Address.fromString(LEMMA_ROUTER_ADDRESS).toHex())
    if (user.id.toString() != lemmaRouterUser.id.toString()) {
        user.unlockBlock = event.block.number + xUSDL.minimumLock;
        user.save()
    }

    //this changes pricePerShare after entryValue is calculated
    if (xUSDL.totalSupply.notEqual(ZERO_BD)) {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            xUSDL.pricePerShare = pricePerShare
        }
    }
    xUSDL.save()
}
export function handleWithdraw(event: Withdraw): void {
    const xUSDLId = "1";
    let xUSDL = XUSDL.load(xUSDLId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(xUSDLId)
        xUSDL.pricePerShare = ONE_BD
    }
    //this changes pricePerShare after entryValue is calculated
    if (xUSDL.totalSupply.notEqual(ZERO_BD)) {
        let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            xUSDL.pricePerShare = pricePerShare
        }
    }
    xUSDL.save()
}


export function handleTransfer(event: Transfer): void {

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

    const usdlId = "1";
    let xUSDL = XUSDL.load(usdlId)
    if (xUSDL === null) {
        xUSDL = new XUSDL(usdlId)
        xUSDL.pricePerShare = ONE_BD
    }
    const valueInBD = convertToDecimal(event.params.value, BI_18)

    //mint
    if (event.params.from == Address.zero()) {
        let userTo = User.load(event.params.to.toHex())
        if (userTo === null) {
            userTo = new User(event.params.to.toHex())
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

        }
        dailyUserTrack.user = userTo.id
        dailyUserTrack.dailyXusdlBalance = dailyUserTrack.dailyXusdlBalance.plus(valueInBD)
        dailyUserTrack.dailyEntryValue = dailyUserTrack.dailyEntryValue.plus(xUSDL.pricePerShare.times(valueInBD))

        userTo.save()
        hourlyUserTrack.save()
        dailyUserTrack.save()

        xUSDL.totalSupply = xUSDL.totalSupply.plus(valueInBD)
        xUSDL.save()
    }
    //burn
    else if (event.params.to == Address.zero()) {
        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
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


        let userToHourID = userTo.id
            .toString()
            .concat('-')
            .concat(hourIndex.toString())
        let hourlyToUserTrack = HourlyUserTrack.load(userToHourID.toString())
        if (hourlyToUserTrack === null) {
            hourlyToUserTrack = new HourlyUserTrack(userToHourID.toString())

        }
        hourlyToUserTrack.user = userTo.id
        hourlyToUserTrack.hourlyXusdlBalance = hourlyToUserTrack.hourlyXusdlBalance.plus(valueInBD)

        let userToDailyID = userTo.id
            .toString()
            .concat('-')
            .concat(dayID.toString())
        let dailyToUserTrack = DailyUserTrack.load(userToDailyID.toString())
        if (dailyToUserTrack === null) {
            dailyToUserTrack = new DailyUserTrack(userToDailyID.toString())

        }
        dailyToUserTrack.user = userTo.id
        dailyToUserTrack.dailyXusdlBalance = dailyToUserTrack.dailyXusdlBalance.plus(valueInBD)

        // userTo.save()
        hourlyToUserTrack.save()
        dailyToUserTrack.save()

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
