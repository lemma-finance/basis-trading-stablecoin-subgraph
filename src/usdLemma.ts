import { Transfer, Rebalance, FeesUpdated, StakingContractUpdated } from '../generated/USDLemma/USDLemma'
import {
    User, USDL, XUSDL,
    HourlyUserTrack, DailyUserTrack,
    HourlyVolume, DailyVolume, MonthlyVolume,
    DailyAPY, WeeklyAPY, MonthlyAPY
} from '../generated/schema'
import { Address, BigInt, BigDecimal, ByteArray } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";
import { XUSDL_ADDRESS } from './const';
import { updateRolledUpData, updateUserRolledUpData, updateAPYRolledUpData } from "./rolledUpUpdates"

export function handleTransfer(event: Transfer): void {

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
    let USDEarning = valueInBD.le(ZERO_BD) ? valueInBD : valueInBD.times(ONE.minus(usdl.fees))//if negative then no fees
    xUSDL.USDEarnings = xUSDL.USDEarnings.plus(USDEarning)
    xUSDL.save()

    let xUSDLUser = User.load(Address.fromString(XUSDL_ADDRESS).toHex())

    //reBalance mints to/burns from xUSDL contract so it changes the pricePerShare
    if (xUSDL.totalSupply.notEqual(ZERO_BD)) {
        if (xUSDLUser !== null) {
            let pricePerShare = xUSDLUser.usdLBalance.div(xUSDL.totalSupply)
            xUSDL.pricePerShare = pricePerShare
        }
    }
    xUSDL.save()
    updateRolledUpData(event)
    updateAPYRolledUpData(event, USDEarning)
}

export function handleFeesUpdated(event: FeesUpdated): void {
    const fees = event.params.newFees
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
    }
    const BI_4 = BigInt.fromI32(4)//fees are in bps
    usdl.fees = convertToDecimal(fees, BI_4)
    usdl.save()
}
export function handleStakingContractUpdated(event: StakingContractUpdated): void {
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
    }
    usdl.xUSDLAddress = event.params.current;
    usdl.save()
}

