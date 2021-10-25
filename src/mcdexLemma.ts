import { MaxPositionUpdated } from '../generated/MCDEXLemma/MCDEXLemma'
import { USDL } from '../generated/schema'
import { BigDecimal } from '@graphprotocol/graph-ts';
import { ZERO_BD } from "./utils";

export function handleMaxPositionUpdated(event: MaxPositionUpdated): void {
    const maxPos = event.params.maxPos
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
        usdl.totalSupply = ZERO_BD
        usdl.multiplier = ZERO_BD
        usdl.fees = ZERO_BD
        usdl.maxCapacity = ZERO_BD
    }
    usdl.maxCapacity = BigDecimal.fromString(maxPos.toString())
    usdl.save()
}
