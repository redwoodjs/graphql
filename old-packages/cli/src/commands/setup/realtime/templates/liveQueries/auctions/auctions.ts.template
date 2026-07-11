// api/src/services/auctions/auctions.ts
import type { LiveQueryStorageMechanism } from '@redwoodjs/realtime'

import { logger } from 'src/lib/logger'

const auctions = [
  { id: '1', title: 'RedwoodJS Logo Shirt', bids: [{ amount: 20 }] },
  { id: '2', title: 'RedwoodJS Lapel Pin', bids: [{ amount: 5 }] },
  { id: '3', title: 'RedwoodJS Beanie', bids: [{ amount: 15 }] },
  { id: '4', title: 'RedwoodJS Dad Hat', bids: [{ amount: 20 }] },
  { id: '5', title: 'RedwoodJS Skater Hat', bids: [{ amount: 20 }] },
]

/**
 * To test this live query, run the following in the GraphQL Playground:
 *
 * query GetCurrentAuctionBids @live {
 *  auction(id: "1") {
 *    bids {
 *      amount
 *    }
 *    highestBid {
 *      amount
 *    }
 *    id
 *    title
 *   }
 * }
 *
 * And then make a bid with the following mutation:
 *
 * mutation MakeBid {
 *   bid(input: {auctionId: "1", amount: 10}) {
 *     amount
 *   }
 * }
 */
export const auction = async ({ id }) => {
  const foundAuction = auctions.find((a) => a.id === id)
  logger.debug({ id, auction: foundAuction }, 'auction')
  return foundAuction
}

export const bid = async (
  { input },
  { context }: { context: { liveQueryStore: LiveQueryStorageMechanism } }
) => {
  const { auctionId, amount } = input

  const index = auctions.findIndex((a) => a.id === auctionId)

  const bid = { amount }

  auctions[index].bids.push(bid)
  logger.debug({ auctionId, bid }, 'Added bid to auction')

  const key = `Auction:${auctionId}`
  context.liveQueryStore.invalidate(key)

  logger.debug({ key }, 'Invalidated auction key in liveQueryStore')

  return bid
}

export const Auction = {
  highestBid: (obj, { root }) => {
    const [max] = root.bids.sort((a, b) => b.amount - a.amount)

    logger.debug({ obj, root }, 'highestBid')

    return max
  },
}
