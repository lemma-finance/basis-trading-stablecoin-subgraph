import { MaxPositionUpdated } from '../generated/MCDEXLemma/MCDEXLemma'
import { USDL } from '../generated/schema'
import { BigDecimal } from '@graphprotocol/graph-ts';
import { convertToDecimal, ZERO_BD, BI_18, ONE_BD } from "./utils";

export function handleMaxPositionUpdated(event: MaxPositionUpdated): void {
    const maxPos = event.params.maxPos
    const usdlId = "1";
    let usdl = USDL.load(usdlId)
    if (usdl === null) {
        usdl = new USDL(usdlId)
        usdl.multiplier = ONE_BD
    }
    usdl.maxCapacity = convertToDecimal(maxPos, BI_18)
    usdl.save()
}
