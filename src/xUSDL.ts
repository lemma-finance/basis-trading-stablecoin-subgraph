import { Deposit, Withdraw, Transfer, UpdateMinimumLock } from '../generated/XUSDL/XUSDL'
import { XUSDL, User, HourlyUserTrack, DailyUserTrack, HourlyVolume, DailyVolume, MonthlyVolume } from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { XUSDL_ADDRESS, LEMMA_ROUTER_ADDRESS } from './const';
import { updateRolledUpData, updateUserRolledUpData } from './rolledUpUpdates';

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
    if (user.id.toString().toLowerCase().localeCompare(lemmaRouterUser.id.toString()) !== 0) {
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
        userTo.save()
        updateUserRolledUpData(event, userTo)

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

        const avgBuyPriceOfUser = userFrom.entryValue.div(valueInBD)
        userFrom.realizedEarnings = userFrom.realizedEarnings.plus((xUSDL.pricePerShare.minus(avgBuyPriceOfUser)).times(valueInBD))
        const oldBalance = userFrom.xUSDLBalance
        const updatedBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedBalance.div(oldBalance))
        userFrom.xUSDLBalance = updatedBalance
        userFrom.save()
        updateUserRolledUpData(event, userFrom)

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
        userTo.save()
        updateUserRolledUpData(event, userTo)


        let userFrom = User.load(event.params.from.toHex())
        if (userFrom === null) {
            //not possible
            userFrom = new User(event.params.to.toHex())
        }
        //handle the minimum lock
        //if transferred from router to some address then change the lock up time for that address
        const lemmaRouterUser = new User(Address.fromString(LEMMA_ROUTER_ADDRESS).toHex())
        if (userFrom.id.toString().toLowerCase().localeCompare(lemmaRouterUser.id.toString().toLowerCase()) == 0) {
            userTo.unlockBlock = event.block.number + xUSDL.minimumLock;
            userTo.save()
        }

        const avgBuyPriceOfUser = userFrom.entryValue.div(valueInBD)
        userFrom.realizedEarnings = userFrom.realizedEarnings.plus((xUSDL.pricePerShare.minus(avgBuyPriceOfUser)).times(valueInBD))
        const oldFromBalance = userFrom.xUSDLBalance
        const updatedFromBalance = userFrom.xUSDLBalance.minus(valueInBD);
        userFrom.entryValue = userFrom.entryValue.times(updatedFromBalance.div(oldFromBalance))
        userFrom.xUSDLBalance = updatedFromBalance
        userFrom.save()
        updateUserRolledUpData(event, userFrom)
    }
    updateRolledUpData(event)
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