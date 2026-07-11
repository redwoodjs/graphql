// api/src/graphql/auctions.sdl.ts

export const schema = gql`
  type Query {
    auction(id: ID!): Auction @requireAuth
  }

  type Auction {
    id: ID!
    title: String!
    highestBid: Bid
    bids: [Bid!]!
  }

  type Bid {
    amount: Int!
  }

  type Mutation {
    bid(input: BidInput!): Bid @requireAuth
  }

  input BidInput {
    auctionId: ID!
    amount: Int!
  }
`
