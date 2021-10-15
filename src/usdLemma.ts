import { Transfer } from '../generated/USDLemma/USDLemma'
import { TransferDone } from '../generated/schema'

export function handleTransfer(event: Transfer): void {
    let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    let transferDone = new TransferDone(id)
    transferDone.from = event.params.from
    transferDone.to = event.params.to
    transferDone.value = event.params.value
    transferDone.save()
}

// export function handleUpdatedGravatar(event: UpdatedGravatar): void {
//     let id = event.params.id.toHex()
//     let gravatar = Gravatar.load(id)
//     if (gravatar == null) {
//         gravatar = new Gravatar(id)
//     }
//     gravatar.owner = event.params.owner
//     gravatar.displayName = event.params.displayName
//     gravatar.imageUrl = event.params.imageUrl
//     gravatar.save()
// }
