export const post = `model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}`

export const contact = `model Contact {
  id        Int      @id @default(autoincrement())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now())
}`

export const user = `model User {
  id                  Int       @id @default(autoincrement())
  email               String    @unique
  hashedPassword      String
  fullName            String
  salt                String
  resetToken          String?
  resetTokenExpiresAt DateTime?
  roles               String?
  posts               Post[]
}`

export const produce = `model Produce {
  id                 String   @id @default(cuid())
  name               String   @unique
  quantity           Int
  price              Int
  nutrients          String?
  region             String
  /// Available only for fruits
  isSeedless         Boolean?
  /// Available only for fruits
  ripenessIndicators String?
  /// Available only for vegetables
  vegetableFamily    String?
  /// Available only for vegetables
  isPickled          Boolean?
  stall              Stall    @relation(fields: [stallId], references: [id], onDelete: Cascade)
  stallId            String
}`

export const stall = `model Stall {
  id          String    @id @default(cuid())
  name        String
  stallNumber String    @unique
  produce     Produce[]
}`
